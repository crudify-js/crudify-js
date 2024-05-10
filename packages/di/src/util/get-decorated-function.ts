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
