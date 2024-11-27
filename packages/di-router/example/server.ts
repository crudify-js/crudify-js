import { createServer } from 'node:http'

import { Injector } from '@crudify-js/di'
import { Router } from '@crudify-js/di-router'
import { asHandler, startServer } from '@crudify-js/http'

import { Config } from './providers/config.js'
import { Logger } from './providers/logger.js'
import { RequestLogger } from './providers/request-logger.js'
import { Home } from './routes/home.js'

export async function server(signal: AbortSignal, injector: Injector) {
  const { http } = injector.get(Config)

  await using router = new Router({
    controllers: [Home],
    injector,
    providers: [
      // Override the default Logger with a RequestLogger
      {
        provide: Logger,
        useClass: RequestLogger,
      },
    ],
  })

  const server = createServer(asHandler(router.middleware))

  await startServer(signal, server, http.port)
}
