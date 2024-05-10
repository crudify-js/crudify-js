import { Injector } from '@crudify-js/di'

import { server } from './server.js'
import { ConfigValue } from './services/config.js'
import { Config } from './services/config.provider.js'
import { LoggerProvider } from './services/logger.provider.js'
import { subTasks } from './util/sub-tasks.js'
import { worker } from './worker.js'

export async function main(signal: AbortSignal, cfg?: ConfigValue) {
  // Global services
  await using rootInjector = new Injector([
    cfg ? Config.provideValue(cfg) : Config.fromEnv(),
    LoggerProvider,
    {
      // Short hand
      provide: 'origin',
      inject: [Config],
      useFactory: (config: Config) => config.http.origin,
    },
  ])

  await subTasks(signal, [
    (signal) => server(signal, rootInjector),
    (signal) => worker(signal, rootInjector),
  ])
}
