export function getDecoratedFunction(target: Object, key?: string | symbol) {
  const item: unknown = key === undefined ? target : (target as any)?.[key]

  if (
    typeof item !== 'function' ||
    (typeof target !== 'object' && key !== undefined)
  ) {
    return undefined
  }

  return item
}

export function getArrayMetadata<T>(
  name: string,
  target: Object,
  propertyKey?: string | symbol
): undefined | T[] {
  const value: unknown =
    propertyKey === undefined
      ? Reflect.getMetadata(name, target)
      : Reflect.getMetadata(name, target, propertyKey)

  if (value !== undefined && !Array.isArray(value)) {
    const targetStr = stringifyTarget(target, propertyKey)
    throw new TypeError(
      `Invalid metadata for ${targetStr}. Expected an array, got ${value}.`
    )
  }

  return value
}

export function stringifyTarget(target: Object, propertyKey?: string | symbol) {
  if (propertyKey === undefined) return stringify(target)

  const item = (target as any)?.[propertyKey]
  const prefix = `${stringify(target.constructor)}.${String(propertyKey)}`
  const suffix = typeof item === 'function' ? `()` : ''

  return `${prefix}${suffix}`
}

export function stringify(token: unknown) {
  return typeof token === 'function' ? token.name : String(token)
}
