import { Injectable } from '@crudify-js/di'
import { IncomingMessage, Req } from '@crudify-js/di-router'
import { Config } from './config.provider.js'
import { Logger } from './logger.js'

@Injectable()
export class RequestLogger extends Logger {
  constructor(config: Config, @Req req: IncomingMessage) {
    const reqOrigin = config.http.trustProxy ? requestOrigin(req) : null
    const url = new URL(req.url || '/', reqOrigin || config.http.origin)

    super(`${config.log.prefix} > Request[${url.href}]`)
  }
}

function requestOrigin(req: IncomingMessage) {
  const host = req.headers['x-forwarded-host'] || req.headers['host']
  if (!host) return null

  const proto = req.headers['x-forwarded-proto'] || 'http'
  return new URL(`${proto}://${host}`)
}
