import {
  Injectable,
  Definition,
  Instantiable,
  Injector,
  Value,
  abstractToken,
  define,
  stringifyToken,
} from '@crudify-js/di'
import {
  IncomingMessage as HttpRequest,
  NextFunction,
  ServerResponse as HttpResponse,
  asHandler,
} from '@crudify-js/http'

export { HttpRequest, HttpResponse, type NextFunction }

export function Controller(path: string) {
  return (target: any) => {
    Reflect.defineMetadata('router:path', path, target)
  }
}

export function Get() {
  return (
    prototype: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) => {
    const methods = Reflect.getMetadata('router:methods', prototype) || {}
    if (methods['GET']) throw new Error('Method already defined')
    methods['GET'] = propertyKey
    Reflect.defineMetadata('router:methods', methods, prototype)

    const paramtypes = Reflect.getMetadata(
      'design:paramtypes',
      prototype,
      propertyKey
    ).map((type: unknown) => {
      switch (type) {
        case undefined:
        case Function:
        case Object:
        case String:
        case Number:
        case Boolean:
        case Symbol:
          // Ignore native types
          return undefined
      }

      return type
    })

    const types =
      Reflect.getMetadata('router:args', prototype, propertyKey) || []
    for (let i = 0; i < paramtypes.length; i++) {
      if (types[i] == undefined) {
        if (paramtypes[i] == null) {
          const methodName = `${stringifyToken(prototype.constructor)}.${propertyKey}()`
          throw new Error(
            `Unable to determine injection Token for argument ${i} in ${methodName}.`
          )
        }

        types[i] = paramtypes[i]
      }
    }

    if (types.some((arg: unknown) => arg === undefined)) {
      throw new Error('Missing argument')
    }

    Reflect.defineMetadata('router:args', types, prototype, propertyKey)
  }
}

export function Req() {
  return (target: any, propertyKey: string, parameterIndex: number) => {
    const args = Reflect.getMetadata('router:args', target, propertyKey) || []
    args[parameterIndex] = HttpRequest
    Reflect.defineMetadata('router:args', args, target, propertyKey)
  }
}

export abstract class Next extends abstractToken<NextFunction>() {}

abstract class HttpHandler {
  constructor(
    readonly controller: Record<string, Function>,
    readonly methodName: string,
    readonly args: Value[]
  ) {}

  async handle() {
    return this.controller[this.methodName]!(...this.args)
  }
}

@Injectable()
export abstract class Router extends abstractToken<
  Map<string, typeof HttpHandler>
>() {
  static middleware(injector: Injector) {
    return asHandler(async (req, res, next) => {
      // We can't use "await using" here because we don't want the injector to
      // be disposed when this function returns. The reason of this is that the
      // injector will destroy the injected values, including "req".

      const requestInjector = injector.fork([
        define(HttpRequest, () => req),
        define(HttpResponse, () => res),
        Next.define(next),
      ])

      const dispose = () => {
        // Will cause "unhandledRejection" if an error occurs (should
        // we allow to define a catcher for this?)
        void requestInjector[Symbol.asyncDispose]()
      }

      res.on('finish', dispose)

      try {
        await requestInjector.get(Router).handle(requestInjector)
      } catch (err) {
        next(err)
      }
    })
  }

  static *create(
    routes: Iterable<Instantiable>
  ): Generator<Definition | Instantiable> {
    const handlers = new Map<string, typeof HttpHandler>()

    for (const Controller of routes) {
      const url = Reflect.getMetadata('router:path', Controller)
      if (!url) {
        throw new Error(`${stringifyToken(Controller)} is not a controller`)
      }

      const methods: Record<string, string> = Reflect.getMetadata(
        'router:methods',
        Controller.prototype
      )
      if (!methods) continue // No method in controller

      yield define(Controller)

      for (const [method, propertyKey] of Object.entries(methods)) {
        const types: Instantiable[] =
          Reflect.getMetadata(
            'router:args',
            Controller.prototype,
            propertyKey
          ) || []

        // Create a new "injection token" for the handler
        @Injectable((injector) => {
          const controller = injector.get(
            Controller
          ) as HttpHandler['controller']
          const args = types.map((arg) => injector.get(arg))
          return new Handler(controller, propertyKey, args)
        })
        class Handler extends HttpHandler {}

        yield Handler

        // Allow the router's handle() method to find the handler's injection
        // token by using the method and url as the key.
        handlers.set(`${method}:${url}`, Handler)
      }
    }

    yield this.define(handlers)
  }

  async handle(requestInjector: Injector) {
    const { method = 'GET', url = '/' } = requestInjector.get(HttpRequest)

    const Handler =
      this.value.get(`${method}:${url}`) || this.value.get(`*:${url}`)
    if (!Handler) return requestInjector.get(Next).value()

    const result = await requestInjector.get(Handler).handle()
    requestInjector.get(HttpResponse).end(result)
  }
}
