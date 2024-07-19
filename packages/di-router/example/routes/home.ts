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
    // Parameters are automatically injected based on the type (thanks to
    // typescrip's emit metadata)
    req: IncomingMessage,
    searchParams: URLSearchParams,
    logger: Logger,
  ) {
    const response = `Home (req.url:${req.url} searchParams:${searchParams})`
    logger.log(response)
    return response
  }
}
