import { Value } from '@crudify-js/di'

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
