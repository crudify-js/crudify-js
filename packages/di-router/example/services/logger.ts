import { Injectable } from '@crudify-js/di'
import { Config } from './config.js'

@Injectable()
export class Logger {
  constructor(readonly config: Config) {}

  get prefix() {
    return `Logger(${this.config.log.prefix})`
  }

  log(...messages: string[]) {
    console.log(this.prefix, ...messages)
  }
}
