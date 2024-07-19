import { Provider, Token } from '@crudify-js/di'
import { IncomingMessage, NextFunction } from '@crudify-js/http'
import { RouteParams } from './routes.js'

export const NextFn: Token<NextFunction> = Symbol('NextFunction')
export const HttpMethod: Token<string> = Symbol('HttpMethod')
export const HttpParams: Token<RouteParams> = Symbol('HttpParams')

export const URLSearchParamsProvider: Provider<URLSearchParams> = {
  provide: URLSearchParams,
  inject: [IncomingMessage],
  useFactory: (req: IncomingMessage) =>
    new URLSearchParams(req.url?.split('?')[1] ?? ''),
}

export type URLProviderOptions = {
  trustProxy?: boolean
  origin?: string | URL
}
