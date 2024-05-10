import { Config } from './config.provider.js'
import { Logger } from '../services/logger.js'

export const LoggerProvider = {
  provide: Logger,
  inject: [Config],
  useFactory: (config: Config) => new Logger(config.log.prefix),
}
