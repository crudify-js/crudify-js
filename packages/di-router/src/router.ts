import { Injector, Instantiable, Provider, Token } from '@crudify-js/di'
import { IncomingMessage, Middleware, ServerResponse } from '@crudify-js/http'
import { RouteParams } from './params.js'
import { URLSearchParamsProvider } from './providers.js'
import { HttpMethod, HttpParams, NextFn } from './tokens.js'
import { combineIterables } from './util.js'

type RouteResult = void | Buffer
type RouteHandler = () => RouteResult | Promise<RouteResult>

// @TODO use a better data structure that allows for faster lookups & supports
// path params.
type RoutesMap = Map<string, Map<string, Token<RouteHandler>>>
const RoutesMapToken: Token<RoutesMap> = Symbol('RoutesMap')

export class Router implements AsyncDisposable {
  readonly #injector: Injector
  readonly #routesMap: RoutesMap

  readonly middleware: Middleware = async (req, res, next) => {
    try {
      const { method, url = '/' } = req
      if (!method) return next()

      const pathMap = this.#routesMap.get(method)
      if (!pathMap) return next()

      const pathname = url.split('?', 1)[0]!
      const token = pathMap.get(pathname)
      if (!token) return next()

      const params: RouteParams = {}

      // Create an injector for this particular request
      await using requestInjector = this.#injector.fork([
        { provide: HttpMethod, useValue: method },
        { provide: HttpParams, useValue: params },
        { provide: NextFn, useValue: next },
        { provide: IncomingMessage, useValue: req },
        { provide: ServerResponse, useValue: res },
        URLSearchParamsProvider,
      ])

      const handler = requestInjector.get(token)

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
    }
  }

  constructor(config: {
    controllers: Iterable<Instantiable>
    providers?: Iterable<Provider>
    injector?: Injector
  }) {
    const providers = combineIterables(
      buildRoutes(config.controllers),
      config.providers,
    )
    this.#injector = new Injector(providers, config.injector)
    this.#routesMap = this.#injector.get(RoutesMapToken)
  }

  async [Symbol.asyncDispose]() {
    await this.#injector[Symbol.asyncDispose]()
  }
}

function* buildRoutes(
  controllers: Iterable<Instantiable>,
): Generator<Provider> {
  const routesMap: RoutesMap = new Map()

  for (const Controller of controllers) {
    const routerController = Reflect.getMetadata(
      'router:controller',
      Controller,
    ) as undefined | { path?: string }

    if (!routerController) {
      throw new Error(`${Controller.name} is not a controller`)
    }

    const pathPrefix = normalizePath(routerController.path)

    const routerMethods: Record<string, string> = Reflect.getMetadata(
      'router:methods',
      Controller.prototype,
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
      routerMethods,
    )) {
      const token = Symbol(`${Controller.name}.${propertyKey}()`)

      yield {
        provide: token,
        useMethod: Controller,
        methodName: propertyKey,
      }

      for (const [httpSubPath, httpVerbs] of Object.entries(propertyMethods)) {
        for (const httpVerb of httpVerbs) {
          const pathSuffix = normalizePath(httpSubPath)
          const fullPath = `${pathPrefix}${pathSuffix}` || '/'

          const pathMap = routesMap.get(httpVerb) || new Map<string, symbol>()
          routesMap.set(httpVerb, pathMap)

          const current = pathMap.get(fullPath)
          if (current) {
            throw new TypeError(
              `Duplicate handler for ${httpVerb} ${fullPath} (${String(
                current,
              )} & ${String(token)})`,
            )
          }
          pathMap.set(fullPath, token)
        }
      }
    }
  }

  yield {
    provide: RoutesMapToken,
    useValue: routesMap,
  }
}

function normalizePath(path?: string) {
  const stripped = path?.replace(/\/+$/g, '/')
  return stripped && !stripped.startsWith('/') ? `/${stripped}` : stripped || ''
}
