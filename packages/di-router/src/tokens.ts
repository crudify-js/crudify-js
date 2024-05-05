import { Value, abstractToken } from '@crudify-js/di'
import { NextFunction } from '@crudify-js/http'

export abstract class Next extends abstractToken<NextFunction>() {}

export abstract class HttpHandler {
  constructor(
    readonly controller: Record<string, Function>,
    readonly methodName: string,
    readonly args: Value[]
  ) {}

  async handle() {
    return this.controller[this.methodName]!(...this.args)
  }
}
