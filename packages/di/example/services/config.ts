import { abstractToken } from '@crudify-js/di'

export function parseEnv(env = process.env) {
  return {
    port: env['PORT'] ?? '3000',
    origin: env['ORIGIN'] ?? 'http://localhost:3000',
    logPrefix: env['LOG_PREFIX'] ?? 'App',
  }
}

export abstract class Config extends abstractToken<
  ReturnType<typeof parseEnv>
>() {
  static fromEnv(env = process.env) {
    return this.inject(parseEnv(env))
  }
}
