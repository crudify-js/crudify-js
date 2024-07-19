import { UseFactory, compileUseFactory } from '../providers/use-factory.js'
import { Token, Value } from '../token.js'
import { setArgumentFactoryMetadata } from '../util/set-argument-factory-metadata.js'

export type { UseFactory }

export function Derived<V extends Value = Value>(options: UseFactory<V>) {
  const factory = compileUseFactory(options)
  return (
    prototype: Object,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ) => {
    setArgumentFactoryMetadata(prototype, propertyKey, parameterIndex, factory)
  }
}

export function asDerived<V extends Value = Value>(token: Token<V>) {
  return Derived<V>({
    inject: [token],
    useFactory: (value: V): V => value,
  })
}
