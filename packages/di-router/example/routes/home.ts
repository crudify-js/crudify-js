import {
  Controller,
  Get,
  IncomingMessage,
  Method,
  Req,
} from '@crudify-js/di-router'
import { Logger } from '../services/logger.js'
import { Inject } from '@crudify-js/di'

@Controller('cats')
export class Home {
  @Get('food')
  async home(
    @Req req: IncomingMessage,
    @Method method: string,
    @Inject('AliasedLoggerService') logger: Logger,
    @Inject('origin') { href: origin }: URL
  ) {
    const response = `Home (method:${method} origin:${origin} url:${req.url})`
    logger.log(response)
    return response
  }
}
