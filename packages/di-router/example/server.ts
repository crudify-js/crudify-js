import { createServer } from 'node:http'

import { Injector } from '@crudify-js/di'
import { Router } from '@crudify-js/di-router'
import { startServer } from '@crudify-js/http'

import { Config } from './providers/config.js'
import { Logger } from './providers/logger.js'
import { RequestLogger } from './providers/request-logger.js'
import { Home } from './routes/home.js'

export async function server(signal: AbortSignal, rootInjector: Injector) {
  // Router specific overrides of global services
  await using injector = rootInjector.fork([
    {
      provide: Logger,
      useClass: RequestLogger,
    },
    {
      provide: 'AliasedLoggerService',
      useExisting: Logger,
    },

    // Router specific services
    ...Router.create({ routes: [Home] }),
  ])

  const config = injector.get(Config)
  const router = Router.middleware(injector, config.http)
  const server = createServer(router)

  await startServer(signal, server, config.http.port)
}
