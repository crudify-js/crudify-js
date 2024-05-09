import 'reflect-metadata'
import { Factory } from './injector.js'
import { Token, Value } from './token.js'
import { getDecoratedFunction } from './util.js'

export function Injectable<V extends Value>(factory?: Factory<V>) {
  return function (target: Token<V>) {
    if (factory) {
      Reflect.defineMetadata('injectable:factory', factory, target)
    }
  }
}

export function InjectFactory(factory: Factory) {
  return (
    prototype: Object,
    propertyKey: string | symbol | undefined,
    parameterIndex: number
  ) => {
    if (!getDecoratedFunction(prototype, propertyKey)) {
      throw new TypeError(
        `The @InjectFactory decorator can only be used on a constructor or method parameter.`
      )
    }

    const args =
      propertyKey === undefined
        ? Reflect.getMetadata('inject:factories', prototype) || []
        : Reflect.getMetadata('inject:factories', prototype, propertyKey) || []

    args[parameterIndex] = factory

    if (propertyKey === undefined) {
      Reflect.defineMetadata('inject:factories', args, prototype)
    } else {
      Reflect.defineMetadata('inject:factories', args, prototype, propertyKey)
    }
  }
}

export function Inject(token: Token) {
  return InjectFactory((injector) => injector.get(token))
}
