import { startServer } from '@crudify-js/http'
import { createServer } from 'node:http'
import 'reflect-metadata'

import { createInjector } from './injector.js'
import { Home } from './routes/home.js'
import { Config } from './services/config.js'
import { Router } from './services/router.js'

export async function main(signal: AbortSignal) {
  await using rootInjector = createInjector()
  await using mainInjector = rootInjector.fork([
    Config.fromEnv(process.env),
    ...Router.create([ Home ]),
  ])

  const router = Router.middleware(mainInjector)
  const server = createServer(router)
  const config = mainInjector.get(Config)

  await startServer(signal, server, config.value.port)
}
