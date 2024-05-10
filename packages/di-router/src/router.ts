import { Injector, Instantiable, Provider, abstractToken } from '@crudify-js/di'
import {
  IncomingMessage,
  NextFunction,
  ServerResponse,
  asHandler,
} from '@crudify-js/http'
import {
  HttpMethod,
  HttpParams,
  HttpQuery,
  HttpRequest,
  HttpResponse,
  HttpUrl,
  HttpUrlOptions,
  NextFn,
  URLProvider,
  URLSearchParamsProvider,
} from './tokens.js'

export type RouterConfig = {
  routes: Iterable<Instantiable>
}

export type RouterMiddlewareOptions = HttpUrlOptions

export abstract class Router extends abstractToken<
  Map<string, Map<string, symbol>>
>() {
  static middleware(injector: Injector, options?: RouterMiddlewareOptions) {
    return asHandler(
      async (req: IncomingMessage, res: ServerResponse, next: NextFunction) => {
        console.time('Router.middleware')

        console.time('Injector.fork')
        await using requestInjector = injector.fork([
          HttpRequest.provideValue(req),
          HttpResponse.provideValue(res),
          NextFn.provideValue(next),
          HttpQuery.fromIncomingMessage(req),
          HttpUrl.fromIncomingMessage(req, options),

          // Short hand getters
          URLProvider,
          URLSearchParamsProvider,
        ])

        console.timeEnd('Injector.fork')

        console.time('Router.handle')
        try {
          await requestInjector.get(Router).handle(requestInjector)
        } catch (err) {
          console.error(err)
          next(err)
        } finally {
          console.timeEnd('Router.handle')
          console.timeEnd('Router.middleware')
        }
      }
    )
  }

  static *create(config: RouterConfig): Generator<Provider> {
    const handlers: [verb: string, path: string, token: symbol][] = []

    for (const Controller of config.routes) {
      const routerController = Reflect.getMetadata(
        'router:controller',
        Controller
      ) as undefined | { path?: string }

      if (!routerController) {
        throw new Error(`${Controller.name} is not a controller`)
      }

      const pathPrefix = normalizePath(routerController.path)

      const routerMethods: Record<string, string> = Reflect.getMetadata(
        'router:methods',
        Controller.prototype
      )
      if (!routerMethods) {
        console.debug(`${Controller.name} has no methods`)
        continue
      }

      yield {
        provide: Controller,
        useClass: Controller,
      }

      for (const [propertyKey, propertyMethods] of Object.entries(
        routerMethods
      )) {
        const token = Symbol(`${Controller.name}.${propertyKey}()`)

        yield {
          provide: token,
          useMethod: Controller,
          methodName: propertyKey,
        }

        for (const [httpSubPath, httpVerbs] of Object.entries(
          propertyMethods
        )) {
          for (const httpVerb of httpVerbs) {
            const pathSuffix = normalizePath(httpSubPath)
            const fullPath = `${pathPrefix}${pathSuffix}` || '/'

            handlers.push([httpVerb, fullPath, token])
          }
        }
      }
    }

    yield this.provideLazy(() => {
      const verbsMap = new Map<string, Map<string, symbol>>()

      for (const [httpVerb, fullPath, token] of handlers) {
        const pathMap = verbsMap.get(httpVerb) || new Map<string, symbol>()
        verbsMap.set(httpVerb, pathMap)

        const current = pathMap.get(fullPath)
        if (current) {
          throw new TypeError(
            `Duplicate handler for ${httpVerb} ${fullPath} (${String(
              current
            )} & ${String(token)})`
          )
        }

        pathMap.set(fullPath, token)
      }

      return verbsMap
    })
  }

  async handle(requestInjector: Injector) {
    const { method = 'GET' } = requestInjector.get(HttpRequest).value

    const pathMap: Map<string, symbol> | undefined = this.value.get(method)
    if (!pathMap) return requestInjector.get(NextFn).value()

    const { pathname } = requestInjector.get(HttpUrl).value
    const token = pathMap.get(pathname)
    if (!token) return requestInjector.get(NextFn).value()

    await using handlerInjector = requestInjector.fork([
      HttpMethod.provideValue(method),
      HttpParams.provideValue({ id: 'TODO' }), // TODO: match & parse url params
    ])

    const handler = handlerInjector.get(token)
    if (!isHandler(handler)) {
      // Should never happen
      throw new TypeError(`Invalid handler for ${method} ${pathname}`)
    }

    const result = await handler()
    handlerInjector.get(HttpResponse).value.end(result)
  }
}

function normalizePath(path?: string) {
  const stripped = path?.replace(/\/+$/g, '/')
  return stripped && !stripped.startsWith('/') ? `/${stripped}` : stripped || ''
}

function isHandler(value: unknown): value is () => unknown {
  return typeof value === 'function' && value.length === 0
}
