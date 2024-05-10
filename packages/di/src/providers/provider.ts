import { Value } from '../token.js'
import { ProviderOptions } from './compile.js'
import { Instantiable } from './instantiable.js'

export type Provider<V extends Value = Value> =
  | Instantiable<V>
  | ProviderOptions<V>
