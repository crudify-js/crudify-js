import { Inject } from '@crudify-js/di'
import { IncomingMessage } from '@crudify-js/http'
import { Config } from './config.js'
import { Logger } from './logger.js'

@Inject()
export class RequestLogger {
  constructor(
    readonly req: IncomingMessage,
    readonly logger: Logger,
    readonly config: Config
  ) {}
  get url() {
    return new URL(this.req.url || '/', this.config.value.origin)
  }
  log(message: string) {
    this.logger.log(`Request(${this.url}):`, message)
  }
  [Symbol.dispose]() {
    console.log('Disposing RequestLogger')
  }
}
