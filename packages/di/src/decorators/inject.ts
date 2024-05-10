import { Factory } from '../providers/factory.js'
import { Token, Value } from '../token.js'
import { setArgumentFactoryMetadata } from '../util/set-argument-factory-metadata.js'

export function Inject<V extends Value = Value>(token: Token<V>) {
  const factory: Factory<V> = (injector) => injector.get(token)
  return (
    prototype: Object,
    propertyKey: string | symbol | undefined,
    parameterIndex: number
  ) => {
    setArgumentFactoryMetadata(prototype, propertyKey, parameterIndex, factory)
  }
}
