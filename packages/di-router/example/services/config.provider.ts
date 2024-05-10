import { abstractToken } from '@crudify-js/di'
import { ConfigValue, parseEnv } from './config.js'

export abstract class Config extends abstractToken<ConfigValue>() {
  static fromEnv(env = process.env) {
    return this.provideValue(parseEnv(env))
  }

  // shorthand getters

  get http() {
    return this.value.http
  }

  get log() {
    return this.value.log
  }
}
