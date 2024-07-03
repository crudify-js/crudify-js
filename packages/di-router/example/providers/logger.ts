import { Config } from './config.js'
import { Logger } from '../lib/logger.js'

export { Logger }

export const LoggerProvider = {
  provide: Logger,
  inject: [Config],
  useFactory: (config: Config) => new Logger(config.log.prefix),
}
