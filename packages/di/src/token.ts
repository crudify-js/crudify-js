// Circular dep. Only use type imports!
import type { Factory, Injector } from './injector.js'
import { getDecoratedFunction } from './util.js'

export type Value = unknown
export type Token<V extends Value = Value> =
  | string
  | symbol
  | (abstract new (...args: any[]) => V)

export function isToken(value: unknown): value is Token {
  switch (typeof value) {
    case 'function':
    case 'string':
    case 'symbol':
      return true
    default:
      return false
  }
}

export function getParams(target: Function): (injector: Injector) => Value[]
export function getParams(
  target: Object,
  key: string | symbol
): (injector: Injector) => Value[]
export function getParams(
  target: Object,
  key?: string | symbol
): (injector: Injector) => Value[] {
  const tokens = getFactories(target, key as any)
  return (injector) => tokens.map(callWithThis, injector)
}

function callWithThis<T, R>(this: T, fn: (arg: T) => R): R {
  return fn(this)
}

/**
 * @example
 * ```ts
 * getFactories(myFunction)
 * ```
 * @example
 * ```ts
 * getFactories(myClass)
 * ```
 */
export function getFactories(target: Function): Factory[]

/**
 * @example
 * ```ts
 * getFactories(myPrototype, 'myMethodName')
 * ```
 * @example
 * ```ts
 * getFactories(myPrototype, Symbol.disposable)
 * ```
 */
export function getFactories(target: Object, key: string | symbol): Factory[]
export function getFactories(target: Object, key?: string | symbol): Factory[] {
  const types = getArrayMetadata('design:paramtypes', target, key)
  const injectFactories = getArrayMetadata('inject:factories', target, key)

  const factories: Factory[] = []
  const item = getDecoratedFunction(target, key)

  if (!item) {
    throw new TypeError(
      `getFactories() must be used on a function, constructor or prototype method.`
    )
  }

  const length = Math.max(
    item.length,
    types?.length ?? 0,
    injectFactories?.length ?? 0
  )

  for (let i = 0; i < length; i++) {
    const factory =
      (injectFactories?.[i] as Factory | undefined) ??
      buildFactory(types?.[i], i, target, key)

    factories.push(factory)
  }

  return factories
}

function buildFactory(
  type: unknown,
  parameterIndex: number,
  target: Object,
  key?: string | symbol
): Factory {
  if (isToken(type)) {
    return (injector) => {
      try {
        return injector.get(type)
      } catch (cause) {
        throw new Error(
          `Error while resolving parameter ${parameterIndex} of ${stringifyTarget(target, key)}`,
          { cause }
        )
      }
    }
  }

  const targetStr = stringifyTarget(target, key)
  throw new Error(
    `Unable to determine injection token for parameter ${parameterIndex} of ${targetStr}.`
  )
}

export function stringify(token: unknown) {
  return typeof token === 'function' ? token.name : String(token)
}

function getArrayMetadata(
  name: string,
  target: Object,
  propertyKey?: string | symbol
) {
  const value =
    propertyKey === undefined
      ? Reflect.getMetadata(name, target)
      : Reflect.getMetadata(name, target, propertyKey)
  return asArrayMetadata(value, target, propertyKey)
}

function stringifyTarget(target: Object, propertyKey?: string | symbol) {
  if (propertyKey === undefined) return stringify(target)

  const item = (target as any)?.[propertyKey]
  const prefix = `${stringify(target.constructor)}.${String(propertyKey)}`
  const suffix = typeof item === 'function' ? `()` : ''

  return `${prefix}${suffix}`
}

function asArrayMetadata(
  value: unknown,
  target: Object,
  propertyKey?: string | symbol
): undefined | unknown[] {
  if (value !== undefined && !Array.isArray(value)) {
    const targetStr = stringifyTarget(target, propertyKey)
    throw new TypeError(
      `Invalid metadata for ${targetStr}. Expected an array, got ${value}.`
    )
  }
  return value
}
