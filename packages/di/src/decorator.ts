import 'reflect-metadata'
import { Factory, Token, Value } from './injector.js'

export function Injectable<V extends Value>(factory?: Factory<V>) {
  return function (target: Token<V>) {
    if (factory) {
      Reflect.defineMetadata('injectable:factory', factory, target)
    }
  }
}
