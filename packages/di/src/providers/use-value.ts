import { Value } from '../token.js'
import { Factory } from './factory.js'

export type UseValue<V extends Value = Value> = {
  useValue: V
  autoDispose?: boolean
}

export function compileUseValue<V extends Value = Value>({
  useValue,
  autoDispose = false,
}: UseValue<V>): Factory<V> {
  return {
    autoDispose,
    create: () => useValue,
  }
}
