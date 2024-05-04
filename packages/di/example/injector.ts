import { Injector } from '@crudify-js/di'
import 'reflect-metadata'

import { Logger } from './services/logger.js'
import { RequestLogger } from './services/request-logger.js'

export function createInjector() {
  return new Injector([
    //
    Logger,
    RequestLogger,
  ])
}
