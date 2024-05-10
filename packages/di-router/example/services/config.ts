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
    port: env['PORT'] ?? '3000',
  },
  log: {
    prefix: env['LOG_PREFIX'] ?? 'MyApp',
  },
})
