import {
  Controller,
  Get,
  IncomingMessage,
  Method,
  Post,
} from '@crudify-js/di-router'
import { Logger } from '../providers/logger.js'

@Controller('cats')
export class Home {
  @Post()
  async createCat(@Method method: string) {
    return `${method} Cat`
  }

  @Get('food')
  async home(
    req: IncomingMessage,
    url: URL,
    query: URLSearchParams,
    logger: Logger,
  ) {
    const response = `Home (url:${url} originalUrl:${req.url} query:${query})`
    logger.log(response)
    return response
  }
}
