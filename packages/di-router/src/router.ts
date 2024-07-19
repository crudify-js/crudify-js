import { Injector, Instantiable, Provider } from '@crudify-js/di'
import {
  IncomingMessage,
  NextFunction,
  ServerResponse,
  asHandler,
} from '@crudify-js/http'
import { Routes } from './routes.js'
import {
  HttpMethod,
  HttpParams,
  URLProviderOptions,
  NextFn,
  URLProviderFactory,
  URLSearchParamsProvider,
} from './tokens.js'
import { combineIterables } from './util.js'

export type RouterMiddlewareOptions = URLProviderOptions

export class Router implements AsyncDisposable {
  protected injector: Injector
  protected routes: Routes

  public middleware = asHandler(
    async (req: IncomingMessage, res: ServerResponse, next: NextFunction) => {
      console.time('Router.middleware')
      try {
        const { method, url = '/' } = req
        if (!method) return next()

        const route = this.routes.find(method, url)
        if (!route) return next()

        // Create an injector for this particular request
        await using requestInjector = this.injector.fork([
          { provide: HttpMethod, useValue: method },
          { provide: HttpParams, useValue: route.params },
          { provide: NextFn, useValue: next },
          { provide: IncomingMessage, useValue: req },
          { provide: ServerResponse, useValue: res },
        ])

        const handler = requestInjector.get(route.token)

        console.time('Router.handle')
        try {
          const result = await handler()
          res.end(result)
        } finally {
          console.timeEnd('Router.handle')
        }
      } catch (err) {
        console.error(err)
        next(err)
      } finally {
        console.timeEnd('Router.middleware')
      }
    },
  )

  constructor(config: {
    controllers: Iterable<Instantiable>
    options?: RouterMiddlewareOptions
    providers?: Iterable<Provider>
    injector?: Injector
  }) {
    const providers = combineIterables(
      config.providers,
      Routes.fromControllers(config.controllers),
      [URLProviderFactory(config.options), URLSearchParamsProvider],
    )
    this.injector = config.injector?.fork(providers) || new Injector(providers)
    this.routes = this.injector.get(Routes)
  }

  async [Symbol.asyncDispose]() {
    await this.injector[Symbol.asyncDispose]()
  }
}
