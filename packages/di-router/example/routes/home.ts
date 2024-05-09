import { Controller, Get, HttpRequest } from '@crudify-js/di-router'
import { Logger } from '../services/logger.js'

@Controller('/')
export class Home {
  @Get()
  async home(request: HttpRequest, logger: Logger) {
    const response = `Home (url:${request.url})`
    logger.log(response)
    return response
  }
}
