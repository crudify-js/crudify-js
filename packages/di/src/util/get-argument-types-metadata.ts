import { getArrayMetadata } from './get-array-metadata.js'

export function getArgumentTypesMetadata(
  target: Object,
  propertyKey?: string | symbol
) {
  return getArrayMetadata<undefined | Function>(
    'design:paramtypes',
    target,
    propertyKey
  )
}
