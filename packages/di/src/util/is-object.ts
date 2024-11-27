export function isObject<T>(value: T): value is T & object {
  return value != null && typeof value === 'object'
}
