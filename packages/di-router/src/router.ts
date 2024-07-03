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
  HttpQuery,
  HttpRequest,
  HttpResponse,
  HttpUrl,
  HttpUrlOptions,
  IncomingMessageProvider,
  NextFn,
  ServerResponseProvider,
  URLProvider,
  URLSearchParamsProvider,
} from './tokens.js'
import { combineIterables } from './util.js'

export type RouterMiddlewareOptions = HttpUrlOptions

export class Router implements AsyncDisposable {
  protected options?: RouterMiddlewareOptions

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
          HttpMethod.provideValue(method),
          HttpParams.provideValue(route.params),
          HttpQuery.fromUrl(url),
          HttpRequest.provideValue(req),
          HttpResponse.provideValue(res),
          HttpUrl.fromIncomingMessage(req, this.options),
          NextFn.provideValue(next),

          // Short hand getters
          URLProvider,
          URLSearchParamsProvider,
          IncomingMessageProvider,
          ServerResponseProvider,
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
    )
    this.options = config.options
    this.injector = config.injector?.fork(providers) || new Injector(providers)
    this.routes = this.injector.get(Routes)
  }

  async [Symbol.asyncDispose]() {
    await this.injector[Symbol.asyncDispose]()
  }
}
