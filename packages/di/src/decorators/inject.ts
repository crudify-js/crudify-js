import { Token, Value } from '../token.js'
import { Derived } from '../providers/arguments.js'

export function Inject<V extends Value = Value>(token: Token<V>) {
  return Derived({
    tokens: [token],
    getter: (value: V): V => value,
  })
}
