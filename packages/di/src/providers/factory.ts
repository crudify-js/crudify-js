import { Token, Value, isToken } from '../token.js'
import { getArgumentFactoriesMetadata } from '../util/get-argument-factories-metadata.js'
import { getArgumentTypesMetadata } from '../util/get-argument-types-metadata.js'
import { getDecoratedFunction } from '../util/get-decorated-function.js'
import { stringifyTarget } from '../util/stringify-target.js'

// Not using Injector from "../injector.ts" to avoid circular dependency
interface FactoryInjector {
  get<V extends Value = Value>(token: Token<V>): V
}

export type Factory<V extends Value = Value> = (injector: FactoryInjector) => V

export function buildFactories(
  target: Object,
  key?: string | symbol
): undefined | Factory[] {
  const types = getArgumentTypesMetadata(target, key)
  const diFactories = getArgumentFactoriesMetadata<Factory>(target, key)

  const factories: Factory[] = []
  const item = getDecoratedFunction(target, key)
  if (!item) return undefined

  const length = Math.max(
    item.length,
    types?.length ?? 0,
    diFactories?.length ?? 0
  )

  for (let i = 0; i < length; i++) {
    const factory = diFactories?.[i]
    if (factory) {
      factories[i] = factory
      continue
    }

    const type = types?.[i]
    if (isToken(type)) {
      factories[i] = (injector) => injector.get(type)
      continue
    }

    const targetStr = stringifyTarget(target, key)
    throw new Error(
      `Unable to determine injection token for parameter ${i} of ${targetStr}.`
    )
  }

  return factories
}
