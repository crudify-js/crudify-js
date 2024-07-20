import { Controller, Get } from '@crudify-js/di-router'

@Controller('users')
export class UsersContoller {
  @Get()
  async home(
    // Parameters are automatically injected based on the type (thanks to
    // typescrip's emit metadata)
    url: URL,
    searchParams: URLSearchParams,
  ) {
    return `Users (url:${url} searchParams:${searchParams})`
  }
}
