import { Injector } from '@crudify-js/di'

import { Config, ConfigValue } from './providers/config.js'
import { LoggerProvider } from './providers/logger.js'
import { server } from './server.js'
import { subTasks } from './util/sub-tasks.js'
import { worker } from './worker.js'

export async function main(signal: AbortSignal, cfg?: ConfigValue) {
  // Global services
  await using rootInjector = new Injector([
    cfg ? Config.provideValue(cfg) : Config.fromEnv(),
    LoggerProvider,
  ])

  await subTasks(signal, [
    (signal) => server(signal, rootInjector),
    (signal) => worker(signal, rootInjector),
  ])
}
