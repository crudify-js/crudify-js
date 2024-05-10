import { UseFactory, compileUseFactory } from '../providers/use-factory.js'
import { Value } from '../token.js'
import { setArgumentFactoryMetadata } from '../util/set-argument-factory-metadata.js'

export type { UseFactory }

export function Computed<V extends Value = Value>(options: UseFactory<V>) {
  const factory = compileUseFactory(options)
  return (
    prototype: Object,
    propertyKey: string | symbol | undefined,
    parameterIndex: number
  ) => {
    setArgumentFactoryMetadata(prototype, propertyKey, parameterIndex, factory)
  }
}
