import {
  Definition,
  Injectable,
  Injector,
  Instantiable,
  Value,
  abstractToken,
  define,
  getTokens,
  stringify,
} from '@crudify-js/di'
import {
  IncomingMessage as HttpRequest,
  ServerResponse as HttpResponse,
  asHandler,
} from '@crudify-js/http'
import { HttpHandler } from './handler.js'
import { NextFn } from './tokens.js'

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
        NextFn.define(next),
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
        console.error(err)
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
        throw new Error(`${stringify(Controller)} is not a controller`)
      }

      const methods: Record<string, string> = Reflect.getMetadata(
        'router:methods',
        Controller.prototype
      )
      if (!methods) {
        console.debug(`${stringify(Controller)} has no methods`)
        continue
      }

      yield define(Controller)

      for (const [method, propertyKey] of Object.entries(methods)) {
        const tokens = getTokens(Controller.prototype, propertyKey)

        // Create a dedicated token for the current handler
        @Injectable((injector) => {
          const controller = injector.get(
            Controller
          ) as HttpHandler['controller']
          const args: Value[] = tokens.map((token) => injector.get(token))
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
    if (!Handler) return requestInjector.get(NextFn).value()

    const result = await requestInjector.get(Handler).handle()
    requestInjector.get(HttpResponse).end(result)
  }
}
