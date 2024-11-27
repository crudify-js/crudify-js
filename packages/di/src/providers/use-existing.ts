import { Token, Value } from '../token.js'
import { Factory } from './factory.js'

export type UseExisting<V extends Value = Value> = {
  useExisting: Token<V>
}

export function compileUseExisting<V extends Value = Value>({
  useExisting: token,
}: UseExisting<V>): Factory<V> {
  return {
    autoDispose: false,
    create: (injector) => injector.get(token),
  }
}
