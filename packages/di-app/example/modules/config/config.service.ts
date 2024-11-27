import { valueProvider } from '@crudify-js/di'

export type ConfigValue = {
  log: {
    prefix: string
  }
}

export function parseEnv(env = process.env): ConfigValue {
  return {
    log: {
      prefix: env['LOG_PREFIX'] ?? 'MyApp',
    },
  }
}

export abstract class ConfigService extends valueProvider<ConfigValue>() {
  static fromEnv(env = process.env) {
    return this.provideValue(parseEnv(env))
  }

  // shorthand getters

  get log() {
    return this.value.log
  }
}
