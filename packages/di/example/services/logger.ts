import { Inject } from '@crudify-js/di'
import { Config } from './config.js'

@Inject()
export class Logger {
  constructor(readonly config: Config) {}
  get prefix() {
    return this.config.value.logPrefix
  }
  log(...messages: string[]) {
    console.log(this.prefix, ...messages)
  }
  [Symbol.dispose]() {
    console.log(`Disposing Logger ${this.prefix}`)
  }
}
