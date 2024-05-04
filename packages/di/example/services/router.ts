import {
  Inject,
  Injectable,
  InjectableToken,
  Injector,
  Value,
  abstractToken,
  asInjectable,
  stringifyToken,
} from '@crudify-js/di'
import {
  IncomingMessage,
  NextFunction,
  ServerResponse,
  asHandler,
} from '@crudify-js/http'

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

    const types = Reflect.getMetadata(
      'design:paramtypes',
      prototype,
      propertyKey
    ).map((type: unknown) => {
      // Only keep classes
      if (typeof type !== 'function') return undefined
      // Ignore native types
      if (type === Function) return undefined
      if (type === Object) return undefined
      if (type === String) return undefined
      if (type === Number) return undefined
      if (type === Boolean) return undefined
      if (type === Symbol) return undefined
      return type
    })

    const args =
      Reflect.getMetadata('router:args', prototype, propertyKey) || []
    for (let i = 0; i < types.length; i++) {
      if (args[i] == undefined) {
        if (types[i] == null) {
          throw new Error(
            `Missing type for argument ${i} in ${stringifyToken(prototype)}.${propertyKey}(). Please use a decorator to specify the type of the argument.`
          )
        }

        args[i] = types[i]
      }
    }

    if (args.some((arg: unknown) => arg === undefined)) {
      throw new Error('Missing argument')
    }

    Reflect.defineMetadata('router:args', args, prototype, propertyKey)
  }
}

export function Req() {
  return (target: any, propertyKey: string, parameterIndex: number) => {
    const args = Reflect.getMetadata('router:args', target, propertyKey) || []
    args[parameterIndex] = IncomingMessage
    Reflect.defineMetadata('router:args', args, target, propertyKey)
  }
}

export abstract class Next extends abstractToken<NextFunction>() {}

interface HttpHandler {
  handle(): Promise<void>
}

@Inject()
export abstract class Router extends abstractToken<
  Map<string, new (..._: any[]) => HttpHandler>
>() {
  static middleware(injector: Injector) {
    return asHandler(async (req, res, next) => {
      const myNext = (err: unknown) => {
        console.error('myNext', err)
        next(err)
      }

      // We can't use "await using" here because we don't want the injector to
      // be disposed when this function returns. The reason of this is that the
      // injector will destroy the injected values, including "req".

      const requestInjector = injector.fork([
        [IncomingMessage, () => req],
        [ServerResponse, () => res],
        Next.inject(myNext),
      ])

      const dispose = async () => {
        try {
          await requestInjector[Symbol.asyncDispose]()
        } catch (err) {
          console.error('Error disposing requestInjector', err)
          throw err // will cause an unhandled promise rejection
        }
      }

      res.on('finish', dispose)

      try {
        await requestInjector.get(Router).handle(requestInjector)
      } catch (err) {
        myNext(err)
      }
    })
  }

  static *create(routes: Iterable<InjectableToken>): Generator<Injectable> {
    const handlers = new Map<string, new (..._: any[]) => HttpHandler>()

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

      yield asInjectable(Controller)

      for (const [method, propertyKey] of Object.entries(methods)) {
        const types: InjectableToken[] =
          Reflect.getMetadata(
            'router:args',
            Controller.prototype,
            propertyKey
          ) || []

        @Inject()
        class Handler implements HttpHandler {
          controller: Record<string, Function>
          args: Value[]
          constructor(
            readonly res: ServerResponse,
            injector: Injector
          ) {
            this.controller = injector.get(Controller) as Record<
              string,
              Function
            >
            this.args = types.map((arg) => injector.get(arg))

            console.log(`Constructing Handler(${method}:${url})`)
          }

          async handle() {
            const result = await this.controller[propertyKey]!(...this.args)
            this.res.end(result)
          }

          [Symbol.dispose]() {
            console.error(`Disposing Handler(${method}:${url})`)
          }
        }

        yield asInjectable(Handler, (injector) => {
          // TODO: load controller & args from here

          // TODO: do not allow Injector to inject itselg
          return new Handler(injector.get(ServerResponse), injector)
        })
        handlers.set(`${method}:${url}`, Handler)
      }
    }

    yield this.inject(handlers)
  }

  async handle(requestInjector: Injector) {
    const req = requestInjector.get(IncomingMessage)
    const { method = 'GET', url = '/' } = req

    console.log(`router.handle(${method}:${url})`)

    const Handler =
      this.value.get(`${method}:${url}`) || this.value.get(`*:${url}`)
    if (!Handler) return requestInjector.get(Next).value()

    try {
      await requestInjector.get(Handler).handle()
    } catch (err) {
      return requestInjector.get(Next).value(err)
    }
  }

  [Symbol.dispose]() {
    console.log(`Disposing Router`)
  }
}
