import { Value } from '../token.js'
import { Factory } from './factory.js'

export type UseValue<V extends Value = Value> = {
  useValue: V
}

export function compileUseValue<V extends Value = Value>({
  useValue,
}: UseValue<V>): Factory<V> {
  return () => useValue
}
