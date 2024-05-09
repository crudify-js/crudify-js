import 'reflect-metadata'

import { Factory, compileFactoryProvider } from './providers.js'
import { Token, Value } from './token.js'
import { getArrayMetadata, getDecoratedFunction } from './util.js'

export function Injectable<V extends Value>() {
  return function (target: Token<V>) {
    // Do nothing
    Reflect.defineMetadata('di:injectable', true, target)
  }
}

export function Computed<V extends Value = Value>(options: {
  inject?: Token[]
  useFactory: (...args: any[]) => V
}) {
  const factory = compileFactoryProvider(options)
  return (
    prototype: Object,
    propertyKey: string | symbol | undefined,
    parameterIndex: number
  ) => {
    setProvideMetadata(prototype, propertyKey, parameterIndex, factory)
  }
}

export function Inject<V extends Value = Value>(token: Token<V>) {
  return (
    prototype: Object,
    propertyKey: string | symbol | undefined,
    parameterIndex: number
  ) => {
    setProvideMetadata(prototype, propertyKey, parameterIndex, (injector) =>
      injector.get(token)
    )
  }
}

function setProvideMetadata<V extends Value>(
  target: Object,
  key: string | symbol | undefined,
  parameterIndex: number,
  factory: Factory<V>
) {
  if (!getDecoratedFunction(target, key)) {
    throw new TypeError(
      `The @Provide decorator can only be used on a constructor or method parameter.`
    )
  }

  const args = getArrayMetadata('di:factories', target, key) || []

  if (args[parameterIndex] !== undefined) {
    throw new TypeError(
      `The @Provide decorator can only be used once per parameter.`
    )
  }

  args[parameterIndex] = factory

  if (key === undefined) {
    Reflect.defineMetadata('di:factories', args, target)
  } else {
    Reflect.defineMetadata('di:factories', args, target, key)
  }
}
