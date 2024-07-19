import { Controller, Get, IncomingMessage } from '@crudify-js/di-router'

@Controller('users')
export class UsersContoller {
  @Get()
  async home(
    // Parameters are automatically injected based on the type (thanks to
    // typescrip's emit metadata)
    req: IncomingMessage,
    url: URL,
    searchParams: URLSearchParams,
  ) {
    return `Users (url:${url} req.url:${req.url} searchParams:${searchParams})`
  }
}
