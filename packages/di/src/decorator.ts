import 'reflect-metadata'
import { Factory, Token, Value } from './injector.js'

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
      Reflect.getMetadata('design:paramtypes', prototype, propertyKey) || []
    args[parameterIndex] = token
    Reflect.defineMetadata('design:paramtypes', args, prototype, propertyKey)
  }
}
