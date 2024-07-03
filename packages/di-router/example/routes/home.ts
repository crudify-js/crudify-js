import { Inject } from '@crudify-js/di'
import {
  Controller,
  Get,
  IncomingMessage,
  Method,
  Post,
  Query,
  Req,
} from '@crudify-js/di-router'
import { Logger } from '../providers/logger.js'

@Controller('cats')
export class Home {
  @Post()
  @Get('food')
  async home(
    @Inject(Home) self: Home,
    @Req req: IncomingMessage,
    @Method method: string,
    @Query query: URLSearchParams,
    @Inject('AliasedLoggerService') logger: Logger,
    @Inject('origin') { href: origin }: URL
  ) {
    console.log('should be true:', self === this)
    const response = `Home (method:${method} origin:${origin} url:${
      req.url
    } query:${query.toString()})`
    logger.log(response)
    return response
  }
}
