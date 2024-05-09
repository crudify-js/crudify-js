import { Controller, Get, IncomingMessage, Req } from '@crudify-js/di-router'
import { Logger } from '../services/logger.js'
import { Inject } from '@crudify-js/di'

@Controller('/')
export class Home {
  @Get()
  async home(
    @Req req: IncomingMessage,
    logger: Logger,
    @Inject('origin') origin: URL
  ) {
    const response = `Home (origin:${origin} url:${req.url})`
    logger.log(response)
    return response
  }
}
