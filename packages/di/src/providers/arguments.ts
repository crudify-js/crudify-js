import { Token, Value, isToken } from '../token.js'
import { getArgumentTypesMetadata } from '../util/get-argument-types-metadata.js'
import { getDecoratedFunction } from '../util/get-decorated-function.js'
import { stringifyTarget } from '../util/stringify-target.js'
import { getArrayMetadata } from '../util/get-array-metadata.js'
import { FactoryInjector } from './factory.js'

export const ARGUMENT_DEFINITIONS_METADATA = 'di:arguments'

type AsTokens<A extends Value[]> = A extends [infer T, ...infer R]
  ? [Token<T>, ...AsTokens<R>]
  : []

export type DerivedDefinition<
  V extends Value = Value,
  A extends Value[] = Value[],
> = {
  getter: (...args: A) => V
  tokens: AsTokens<A>
}

export function Derived<V extends Value, A extends Value[]>(
  definition: DerivedDefinition<V, A>,
): (
  prototype: Object,
  propertyKey: string | symbol | undefined,
  parameterIndex: number,
) => void
export function Derived(
  definition: DerivedDefinition,
): (
  prototype: Object,
  propertyKey: string | symbol | undefined,
  parameterIndex: number,
) => void {
  return (prototype, propertyKey, parameterIndex) => {
    if (!getDecoratedFunction(prototype, propertyKey)) {
      throw new TypeError(
        `The @Provide decorator can only be used on a constructor or method parameter.`,
      )
    }

    const args =
      getArrayMetadata<undefined | DerivedDefinition>(
        ARGUMENT_DEFINITIONS_METADATA,
        prototype,
        propertyKey,
      ) || []

    if (args[parameterIndex] !== undefined) {
      throw new TypeError(
        `The @Provide decorator can only be used once per parameter.`,
      )
    }

    args[parameterIndex] = definition

    if (propertyKey === undefined) {
      Reflect.defineMetadata(ARGUMENT_DEFINITIONS_METADATA, args, prototype)
    } else {
      Reflect.defineMetadata(
        ARGUMENT_DEFINITIONS_METADATA,
        args,
        prototype,
        propertyKey,
      )
    }
  }
}

export function buildDefinitions(
  target: Object,
  key?: string | symbol,
): undefined | DerivedDefinition[] {
  const item = getDecoratedFunction(target, key)
  if (!item) return undefined

  const types = getArgumentTypesMetadata(target, key)
  const argDefs = getArrayMetadata<undefined | DerivedDefinition>(
    ARGUMENT_DEFINITIONS_METADATA,
    target,
    key,
  )

  const length = Math.max(item.length, types?.length ?? 0, argDefs?.length ?? 0)

  const definitions: DerivedDefinition<Value, any>[] = Array(length)

  for (let i = 0; i < length; i++) {
    const factory = argDefs?.[i]
    if (factory) {
      definitions[i] = factory
      continue
    }

    const type = types?.[i]
    if (isToken(type)) {
      definitions[i] = {
        tokens: [type],
        getter: identity<Value>,
      }
      continue
    }

    const targetStr = stringifyTarget(target, key)
    throw new Error(
      `Unable to determine injection token for parameter ${i} of ${targetStr}.`,
    )
  }

  return definitions
}

export function buildArguments(
  target: Object,
  key?: string | symbol,
): undefined | ((injector: FactoryInjector) => Value[]) {
  const definitions = buildDefinitions(target, key)
  if (!definitions) return undefined

  return (injector) => definitions.map(invokeDefinition, injector)
}

export function invokeDefinition<V extends Value, A extends Value[]>(
  this: FactoryInjector,
  { tokens, getter }: DerivedDefinition<V, A>,
): V {
  const args = tokens.map(this.get, this) as A
  return getter(...args)
}

const identity = <T>(value: T) => value
