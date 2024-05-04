import { IncomingMessage } from '@crudify-js/http'
// import { RequestLogger } from '../services/request-logger.js'
import { Logger } from '../services/logger.js'
import { Controller, Get } from '../services/router.js'

@Controller('/')
export class Home {
  constructor(readonly logger: Logger) {
    console.error('Constructing Home Controller')
  }

  @Get()
  async home(request: IncomingMessage) {
    this.logger.log('Home: ' + request.url)
    return 'Home'
  }

  [Symbol.dispose]() {
    console.error('Disposing Home Controller')
  }
}
