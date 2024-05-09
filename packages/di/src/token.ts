export type Value = unknown
export type Token<V extends Value = Value> =
  | string
  | symbol
  | (abstract new (...args: any[]) => V)

export function isToken(value: unknown): value is Token {
  switch (typeof value) {
    case 'function':
    case 'string':
    case 'symbol':
      return true
    default:
      return false
  }
}
