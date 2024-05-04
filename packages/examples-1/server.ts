import * as Hapi from 'hapi'
import CrudifyPlugin from '@crudify-js/hapi'

import { Config } from './config'
import { Services } from './services'
import { models } from './models'
import { createContext } from './context'
import { createDrivers } from './drivers'

export async function createServer(config: Config, services: Services) {
  const server = new Hapi.Server({
    host: config.host,
    port: config.port,
    routes: {
      state: { parse: false },
    },
  })

  await server.register({
    plugin: CrudifyPlugin,
    options: {
      models,
      drivers: createDrivers(config),
      context: (request: Hapi.Request) =>
        createContext(config, services, request),
      policy:
        (request: Hapi.Request) =>
        (type: string, action: 'create' | 'update' | 'read' | 'delete') =>
          null,
    },
  })
}
