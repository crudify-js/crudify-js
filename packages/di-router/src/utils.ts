import { Token, ifToken, stringifyToken } from '@crudify-js/di'

export function getParamTokens(prototype: any, propertyKey: string): Token[] {
  const paramtypes = Reflect.getMetadata(
    'design:paramtypes',
    prototype,
    propertyKey
  )

  if (paramtypes == null) {
    throw new Error(
      `Missing paramtypes for ${propertyKey}. Did you forget to enable "emitDecoratorMetadata" in your tsconfig.json?`
    )
  } else if (!Array.isArray(paramtypes)) {
    throw new Error(
      `Invalid paramtypes for ${propertyKey}. Expected an array, got ${paramtypes}.`
    )
  }

  const tokens = paramtypes.map(ifToken)

  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] == null) {
      throw new Error(
        `Unknown type for parameter ${i} of ${stringifyToken(prototype.constructor)}.`
      )
    }
  }

  return tokens as Token[]
}
