import {
  Definition,
  Injectable,
  Injector,
  Instantiable,
  abstractToken,
  define,
  getParams,
  stringify,
} from '@crudify-js/di'
import { asHandler } from '@crudify-js/http'
import { HttpHandler } from './handler.js'
import { HttpRequest, HttpResponse, NextFn } from './tokens.js'

@Injectable()
export abstract class Router extends abstractToken<
  Map<string, typeof HttpHandler>
>() {
  static middleware(injector: Injector) {
    return asHandler(async (req, res, next) => {
      await using requestInjector = injector.fork([
        HttpRequest.define(req),
        HttpResponse.define(res),
        NextFn.define(next),
      ])

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
        const params = getParams(Controller.prototype, propertyKey)

        // Create a dedicated token for the current handler
        @Injectable((injector) => {
          const controller = injector.get(
            Controller
          ) as HttpHandler['controller']
          const args = params(injector)
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
    const { method = 'GET', url = '/' } = requestInjector.get(HttpRequest).value

    const Handler =
      this.value.get(`${method}:${url}`) || this.value.get(`*:${url}`)
    if (!Handler) return requestInjector.get(NextFn).value()

    const result = await requestInjector.get(Handler).handle()
    requestInjector.get(HttpResponse).value.end(result)
  }
}
