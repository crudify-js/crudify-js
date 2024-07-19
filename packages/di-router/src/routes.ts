import { Instantiable, Provider, Token } from '@crudify-js/di'

export type RouteResult = void | Buffer
export type RouteParams = Record<string, string | undefined>
export type RouteHandler = () => RouteResult | Promise<RouteResult>

// @TODO use a better data structure that allows for faster lookups & supports
// path params.
type RoutesMap = Map<string, Map<string, Token<RouteHandler>>>

export class Routes {
  static *fromControllers(
    controllers: Iterable<Instantiable>,
  ): Generator<Provider> {
    console.time('Routes.fromControllers')

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

        for (const [httpSubPath, httpVerbs] of Object.entries(
          propertyMethods,
        )) {
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
      provide: this,
      useFactory: () => new Routes(routesMap),
    }

    console.timeEnd('Router.fromControllers')
  }

  constructor(protected readonly routesMap: RoutesMap) {}

  find(
    method: string,
    url: string,
  ):
    | undefined
    | {
        token: Token<RouteHandler>
        params: RouteParams
      } {
    const pathMap = this.routesMap.get(method)
    if (!pathMap) return undefined

    const pathname = url.split('?', 1)[0]!
    const token = pathMap.get(pathname)
    if (!token) return undefined

    return { token, params: {} }
  }
}

function normalizePath(path?: string) {
  const stripped = path?.replace(/\/+$/g, '/')
  return stripped && !stripped.startsWith('/') ? `/${stripped}` : stripped || ''
}
