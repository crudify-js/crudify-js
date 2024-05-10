import { getArrayMetadata } from './get-array-metadata.js'

export function getArgumentFactoriesMetadata<T>(
  target: Object,
  propertyKey?: string | symbol
) {
  return getArrayMetadata<undefined | T>('di:factories', target, propertyKey)
}
