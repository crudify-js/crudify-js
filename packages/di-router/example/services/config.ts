import { abstractToken } from '@crudify-js/di'

export type ConfigValue = {
  http: {
    trustProxy: boolean
    port: string
    origin: URL
  }
  log: {
    prefix: string
  }
}

export abstract class Config extends abstractToken<ConfigValue>() {
  static fromEnv(env = process.env) {
    return this.provideValue({
      http: {
        trustProxy: env['TRUST_PROXY'] === 'true',
        port: env['PORT'] ?? '3000',
        origin: new URL(env['ORIGIN'] ?? 'http://localhost:3000'),
      },
      log: {
        prefix: env['LOG_PREFIX'] ?? 'App',
      },
    })
  }

  // shorthand getters

  get http() {
    return this.value.http
  }

  get log() {
    return this.value.log
  }
}
