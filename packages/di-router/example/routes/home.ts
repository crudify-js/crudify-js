import {
  Controller,
  Get,
  IncomingMessage,
  Method,
  Post,
} from '@crudify-js/di-router'
import { Logger } from '../providers/logger.js'
import { Origin } from '../tokens/origin.js'

@Controller('cats')
export class Home {
  @Post()
  async createCat(@Method method: string, @Origin origin: string) {
    return `${method} Cat (origin:${origin})`
  }

  @Get('food')
  async home(
    // Parameters are automatically injected based on the type (thanks to
    // typescrip's emit metadata)
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
