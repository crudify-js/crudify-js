import 'reflect-metadata'
import { Factory } from './injector.js'
import { Token, Value } from './token.js'

export function Injectable<V extends Value>(factory?: Factory<V>) {
  return function (target: Token<V>) {
    if (factory) {
      Reflect.defineMetadata('injectable:factory', factory, target)
    }
  }
}

export function Inject(token: Token) {
  return (prototype: any, propertyKey: string, parameterIndex: number) => {
    const args =
      Reflect.getMetadata('inject:tokens', prototype, propertyKey) || []
    args[parameterIndex] = token
    Reflect.defineMetadata('inject:tokens', args, prototype, propertyKey)
  }
}
