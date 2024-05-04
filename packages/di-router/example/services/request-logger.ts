import { Inject } from '@crudify-js/di'
import { HttpRequest } from '@crudify-js/di-router'
import { Config } from './config.js'
import { Logger } from './logger.js'

@Inject()
export class RequestLogger extends Logger {
  url: string

  constructor(config: Config, req: HttpRequest) {
    super(config)

    const reqOrigin = config.http.trustProxy ? requestOrigin(req) : null
    const url = new URL(req.url || '/', reqOrigin || config.http.origin)

    this.url = url.href
  }

  override get prefix() {
    return `${super.prefix} > RequestLogger(${this.url})`
  }
}

function requestOrigin(req: HttpRequest) {
  const host = req.headers['x-forwarded-host'] || req.headers['host']
  if (!host) return null

  const proto = req.headers['x-forwarded-proto'] || 'http'
  return new URL(`${proto}://${host}`)
}
