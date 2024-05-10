export function stringify(token: unknown) {
  return typeof token === 'function' ? token.name : String(token)
}
