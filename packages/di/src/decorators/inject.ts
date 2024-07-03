import { Factory } from '../providers/factory.js'
import { Token, Value } from '../token.js'
import { setArgumentFactoryMetadata } from '../util/set-argument-factory-metadata.js'
import { Derived } from './derived.js'

export function Inject<V extends Value = Value>(token: Token<V>) {
  return Derived<V>({
    inject: [token],
    useFactory: (value) => value,
  })
}
