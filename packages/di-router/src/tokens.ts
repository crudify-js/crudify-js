import { Provider, abstractToken } from '@crudify-js/di'
import { IncomingMessage, NextFunction, ServerResponse } from '@crudify-js/http'

export abstract class NextFn extends abstractToken<NextFunction>() {}
export abstract class HttpRequest extends abstractToken<IncomingMessage>() {}
export abstract class HttpResponse extends abstractToken<ServerResponse>() {}

export abstract class HttpMethod extends abstractToken<string>() {}
export abstract class HttpParams extends abstractToken<
  Record<string, string | undefined>
>() {}

export abstract class HttpQuery extends abstractToken<URLSearchParams>() {
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
  urlOrigin?: string

  trustProxy?: boolean
  urlProtocol?: 'http' | 'https'
  urlHost?: string
  urlPort?: number
}
export abstract class HttpUrl extends abstractToken<URL>() {
  static fromIncomingMessage(req: IncomingMessage, options?: HttpUrlOptions) {
    if (options?.urlOrigin) {
      return this.provideValue(new URL(req.url || '/', options.urlOrigin))
    }

    const trustProxy = options?.trustProxy === true

    const host: string | undefined =
      options?.urlHost ??
      ifString(trustProxy && req.headers['x-forwarded-host']) ??
      ifString(req.headers['host'])

    if (!host) {
      throw new Error(`Host header is required to construct URL`)
    }

    const protocol: 'http' | 'https' =
      options?.urlProtocol ??
      ifHttpProto(trustProxy && req.headers['x-forwarded-proto']) ??
      ('encrypted' in req.socket && req.socket.encrypted === true
        ? 'https'
        : 'http')

    const port = host.includes(':')
      ? ''
      : options?.urlPort ??
        ifHttpPort(trustProxy && req.headers['x-forwarded-port']) ??
        (protocol === 'http' ? '80' : '443')

    return this.provideValue(
      new URL(`${protocol}://${host}${port ? `:${port}` : ''}${req.url}`)
    )
  }
}

export const URLProvider: Provider<URL> = {
  provide: URL,
  inject: [HttpUrl],
  useFactory: (i: HttpUrl) => i.value,
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
