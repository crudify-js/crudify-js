export type Value = object
export type Token<V extends Value = Value> = abstract new (...args: any[]) => V

// Generic types that can be set as "design:paramtypes" metadata by TypeScript.
export const INVALID_TOKENS = new Set<Function>([
  Array,
  ArrayBuffer,
  Boolean,
  DataView,
  Date,
  Error,
  EvalError,
  Float32Array,
  Float64Array,
  Function,
  Int16Array,
  Int32Array,
  Int8Array,
  Map,
  Number,
  Object,
  Promise,
  RangeError,
  ReferenceError,
  RegExp,
  Set,
  SharedArrayBuffer,
  String,
  Symbol,
  SyntaxError,
  TypeError,
  URIError,
  Uint16Array,
  Uint32Array,
  Uint8Array,
  Uint8ClampedArray,
  WeakMap,
  WeakSet,
])

export function isToken(value: unknown): value is Token {
  switch (typeof value) {
    case 'function':
      return !INVALID_TOKENS.has(value)
    default:
      return false
  }
}

/**
 * @example
 * ```ts
 * getTokens(myFunction)
 * ```
 * @example
 * ```ts
 * getTokens(myClass)
 * ```
 */
export function getTokens(target: Function): Token[]

/**
 * @example
 * ```ts
 * getTokens(myPrototype, 'myMethodName')
 * ```
 * @example
 * ```ts
 * getTokens(myPrototype, Symbol.disposable)
 * ```
 */
export function getTokens(target: Object, key: string | symbol): Token[]
export function getTokens(target: Object, key?: string | symbol): Token[] {
  const types = getArrayMetadata('design:paramtypes', target, key)
  const injectTokens = getArrayMetadata('inject:tokens', target, key)

  const tokens: Token[] = []
  const item: unknown = key === undefined ? target : (target as any)?.[key]

  if (
    typeof item !== 'function' ||
    (typeof target !== 'object' && key !== undefined)
  ) {
    throw new TypeError(
      `getTokens() must be used on a function, constructor or prototype method.`
    )
  }

  const length = Math.max(
    item.length,
    types?.length ?? 0,
    injectTokens?.length ?? 0
  )
  for (let i = 0; i < length; i++) {
    const token = injectTokens?.[i] ?? types?.[i]
    if (!isToken(token)) {
      const targetStr = stringifyTarget(target, key)
      throw new Error(
        `Unable to determine injection token for parameter ${i} of ${targetStr}.`
      )
    }
    tokens.push(token)
  }

  return tokens
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
