import {
  Controller,
  Get,
  IncomingMessage,
  Method,
  Post,
} from '@crudify-js/di-router'

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
    url: URL,
    searchParams: URLSearchParams,
  ) {
    return `Home (url:${url} req.url:${req.url} searchParams:${searchParams})`
  }
}