import { Token, Value } from '../token.js'
import { Derived } from './derived.js'

export function Inject<V extends Value = Value>(token: Token<V>) {
  return Derived<V>({
    inject: [token],
    useFactory: (value) => value,
  })
}
