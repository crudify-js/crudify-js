import { Injector } from '@crudify-js/di'

import { Config } from './providers/config.js'
import { Logger } from './providers/logger.js'
import { sleep } from './util/sleep.js'

export async function worker(signal: AbortSignal, rootInjector: Injector) {
  // Worker specific overrides of global services
  await using injector = rootInjector.fork([
    {
      provide: Logger,
      inject: [Config],
      useFactory: (config: Config) =>
        new Logger(config.log.prefix + ' > Worker'),
    },
  ])

  while (!signal.aborted) {
    injector.get(Logger).log('Working')
    await sleep(10_000, signal)
  }

  injector.get(Logger).log('Cleaning up...')
  await sleep(500)
  injector.get(Logger).log('Done')
}
