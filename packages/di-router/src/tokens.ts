import { Provider, valueProvider } from '@crudify-js/di'
import { IncomingMessage, NextFunction, ServerResponse } from '@crudify-js/http'
import { RouteParams } from './routes.js'

export abstract class NextFn extends valueProvider<NextFunction>() {}
export abstract class HttpRequest extends valueProvider<IncomingMessage>() {}
export abstract class HttpResponse extends valueProvider<ServerResponse>() {}

export abstract class HttpMethod extends valueProvider<string>() {}
export abstract class HttpParams extends valueProvider<RouteParams>() {}

export abstract class HttpQuery extends valueProvider<URLSearchParams>() {
  static fromIncomingMessage(req: IncomingMessage) {
    return this.fromUrl(req.url)
  }
  static fromUrl(url?: string) {
    return this.fromString(url?.split('?', 2)[1])
  }
  static fromString(str?: string) {
    return this.provideValue(new URLSearchParams(str))
  }
}

export const URLSearchParamsProvider: Provider<URLSearchParams> = {
  provide: URLSearchParams,
  inject: [HttpQuery],
  useFactory: (i: HttpQuery) => i.value,
}

export type HttpUrlOptions = {
  trustProxy?: boolean
  origin?: string | URL
}
export abstract class HttpUrl extends valueProvider<URL>() {
  static fromIncomingMessage(
    req: IncomingMessage,
    options?: HttpUrlOptions,
  ): Provider<{ value: URL }> {
    if (options?.origin) {
      return this.provideValue(new URL(req.url || '/', options.origin))
    }

    return this.provideLazy(() => {
      const trustProxy = options?.trustProxy === true

      const host: string | undefined =
        ifString(trustProxy && req.headers['x-forwarded-host']) ??
        ifString(req.headers['host'])

      if (!host) {
        throw new Error(`Host header is required to construct URL`)
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
    })
  }
}

export const URLProvider: Provider<URL> = {
  provide: URL,
  inject: [HttpUrl],
  useFactory: (i: HttpUrl) => i.value,
}

export const IncomingMessageProvider: Provider<IncomingMessage> = {
  provide: IncomingMessage,
  inject: [HttpRequest],
  useFactory: (i: HttpRequest) => i.value,
}

export const ServerResponseProvider: Provider<ServerResponse> = {
  provide: ServerResponse,
  inject: [HttpResponse],
  useFactory: (i: HttpResponse) => i.value,
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
