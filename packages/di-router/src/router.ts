import {
  Injectable,
  Injector,
  Instantiable,
  Provider,
  abstractToken,
} from '@crudify-js/di'
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

@Injectable()
export abstract class Router extends abstractToken<
  Map<string, Map<string, symbol>>
>() {
  static middleware(injector: Injector, options?: HttpUrlOptions) {
    return asHandler(
      async (req: IncomingMessage, res: ServerResponse, next: NextFunction) => {
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

        try {
          await requestInjector.get(Router).handle(requestInjector)
        } catch (err) {
          console.error(err)
          next(err)
        }
      }
    )
  }

  static *create(config: RouterConfig): Generator<Provider> {
    const verbsMap = new Map<string, Map<string, symbol>>()

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

            const pathMap = verbsMap.get(httpVerb) || new Map<string, symbol>()
            verbsMap.set(httpVerb, pathMap)

            const current = pathMap.get(fullPath)
            if (current) {
              throw new TypeError(
                `Duplicate handler for ${httpVerb} ${fullPath} (${String(current)} & ${String(token)})`
              )
            }

            pathMap.set(fullPath, token)
          }
        }
      }
    }

    yield this.provideValue(verbsMap)
  }

  async handle(requestInjector: Injector) {
    const { method = 'GET' } = requestInjector.get(HttpRequest).value

    const pathMap: Map<string, symbol> | undefined = this.value.get(method)
    if (!pathMap) return requestInjector.get(NextFn).value()

    const { pathname } = requestInjector.get(URL)
    const token = pathMap.get(pathname)
    if (!token) return requestInjector.get(NextFn).value()

    await using handlerInjector = requestInjector.fork([
      HttpMethod.provideValue(method),
      HttpParams.provideValue({ id: 'TODO' }), // TODO: match & parse url params
    ])

    const handler = handlerInjector.get(token)
    if (!isHandler(handler)) {
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
