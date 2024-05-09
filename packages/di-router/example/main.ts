import { Injector, define, overrideToken } from '@crudify-js/di'
import { Router } from '@crudify-js/di-router'
import { startServer } from '@crudify-js/http'
import { createServer } from 'node:http'
import 'reflect-metadata'

import { Home } from './routes/home.js'
import { Config, ConfigValue } from './services/config.js'
import { Logger } from './services/logger.js'
import { RequestLogger } from './services/request-logger.js'

export async function main(signal: AbortSignal, cfg?: ConfigValue) {
  await using injector = new Injector([
    // Global services
    cfg ? Config.define(cfg) : Config.fromEnv(),
    Logger,
  ])

  await using routerInjector = injector.fork([
    // Router specific overrides of global services
    overrideToken(Logger, RequestLogger),
    define('origin', (injector) => injector.get(Config).http.origin),

    // Router specific services
    ...Router.create([Home]),
  ])

  const router = Router.middleware(routerInjector)
  const server = createServer(router)
  const config = injector.get(Config)

  await startServer(signal, server, config.http.port)
}
