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

export const URLProviderFactory = (
  options?: URLProviderOptions,
): Provider<URL> => {
  const origin = options?.origin
  if (origin) {
    return {
      provide: URL,
      inject: [IncomingMessage],
      useFactory: (req: IncomingMessage) => new URL(req.url || '/', origin),
    }
  }

  const trustProxy = options?.trustProxy === true
  return {
    provide: URL,
    inject: [IncomingMessage],
    useFactory: (req: IncomingMessage) => {
      const host: string | undefined =
        ifString(trustProxy && req.headers['x-forwarded-host']) ??
        ifString(req.headers['host'])

      if (!host) {
        throw new Error(`HTTP/1.0 compatibility requires an "origin" header`)
      }

      const protocol: 'http' | 'https' =
        ifHttpProto(trustProxy && req.headers['x-forwarded-proto']) ??
        ('encrypted' in req.socket && req.socket.encrypted === true
          ? 'https'
          : 'http')

      const port = host.includes(':')
        ? ''
        : ifHttpPort(trustProxy && req.headers['x-forwarded-port']) ??
          (protocol === 'http' ? '80' : '443')

      return new URL(`${protocol}://${host}${port ? `:${port}` : ''}${req.url}`)
    },
  }
}

function ifString(v: unknown): undefined | string {
  if (typeof v === 'string') return v
  return undefined
}

function ifHttpPort(v: unknown): undefined | number {
  if (typeof v === 'string' && /^\d+$/.test(v)) return parseInt(v)
  return undefined
}

function ifHttpProto(v: unknown): undefined | 'http' | 'https' {
  switch (v) {
    case 'http':
    case 'https':
      return v
    default:
      return undefined
  }
}
