import { Factory } from '../providers/factory.js'
import { getArrayMetadata } from './get-array-metadata.js'
import { getDecoratedFunction } from './get-decorated-function.js'

export function setArgumentFactoryMetadata(
  target: Object,
  key: string | symbol | undefined,
  parameterIndex: number,
  factory: Factory,
) {
  if (!getDecoratedFunction(target, key)) {
    throw new TypeError(
      `The @Provide decorator can only be used on a constructor or method parameter.`,
    )
  }

  const args = getArrayMetadata('di:factories', target, key) || []

  if (args[parameterIndex] !== undefined) {
    throw new TypeError(
      `The @Provide decorator can only be used once per parameter.`,
    )
  }

  args[parameterIndex] = factory

  if (key === undefined) {
    Reflect.defineMetadata('di:factories', args, target)
  } else {
    Reflect.defineMetadata('di:factories', args, target, key)
  }
}
