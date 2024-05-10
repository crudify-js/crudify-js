import { stringifyTarget } from './stringify-target.js'

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
