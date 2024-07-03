import { abstractToken } from '@crudify-js/di'
import { RouterMiddlewareOptions } from '@crudify-js/di-router'

export type ConfigValue = {
  http: RouterMiddlewareOptions & {
    port: string
  }
  log: {
    prefix: string
  }
}

export const parseEnv = (env = process.env): ConfigValue => ({
  http: {
    trustProxy: env['TRUST_PROXY'] === 'true',
    origin: new URL(env['ORIGIN'] ?? 'http://localhost:3000'),
    port: env['PORT'] ?? '4000',
  },
  log: {
    prefix: env['LOG_PREFIX'] ?? 'MyApp',
  },
})

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
