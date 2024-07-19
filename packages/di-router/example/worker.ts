import { Injector } from '@crudify-js/di'

import { Config } from './providers/config.js'
import { Logger } from './providers/logger.js'
import { sleep } from './util/sleep.js'
import { subTasks } from './util/sub-tasks.js'

export async function worker(signal: AbortSignal, rootInjector: Injector) {
  // Worker specific overrides of root services
  await using workerInjector = rootInjector.fork([
    {
      provide: Logger,
      inject: [Config],
      useFactory: (config: Config) =>
        new Logger(config.log.prefix + ' > Worker'),
    },
  ])

  await subTasks(signal, [
    //
    (signal) => myTask(signal, workerInjector),
  ])
}

async function myTask(signal: AbortSignal, rootInjector: Injector) {
  // overrides for this particular task
  await using injector = rootInjector.fork([
    {
      provide: Logger,
      inject: [Config],
      useFactory: (config: Config) =>
        new Logger(config.log.prefix + ' > myTask'),
    },
  ])

  const logger = injector.get(Logger)

  try {
    while (!signal.aborted) {
      logger.log('Working')
      await sleep(10_000, signal)
    }
  } finally {
    logger.log('Cleaning up...')
    await sleep(500)
    logger.log('Done')
  }
}
