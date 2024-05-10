import { Inject } from '@crudify-js/di'
import {
  Controller,
  Get,
  IncomingMessage,
  Method,
  Query,
  Req,
} from '@crudify-js/di-router'
import { Logger } from '../services/logger.js'

@Controller('cats')
export class Home {
  @Get('food')
  async home(
    @Req req: IncomingMessage,
    @Method method: string,
    @Query query: URLSearchParams,
    @Inject('AliasedLoggerService') logger: Logger,
    @Inject('origin') { href: origin }: URL
  ) {
    const response = `Home (method:${method} origin:${origin} url:${req.url} query:${query.toString()})`
    logger.log(response)
    return response
  }
}
