import { stringify } from './stringify.js'

export function stringifyTarget(target: Object, propertyKey?: string | symbol) {
  if (propertyKey === undefined) return stringify(target)

  const item = (target as any)?.[propertyKey]
  const prefix = `${stringify(target.constructor)}.${String(propertyKey)}`
  const suffix = typeof item === 'function' ? `()` : ''

  return `${prefix}${suffix}`
}
