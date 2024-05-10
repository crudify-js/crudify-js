import { Token, Value } from '../token.js'
import { Factory } from './factory.js'

export type UseFactory<V extends Value = Value> = {
  useFactory: (...args: any[]) => V
  inject?: Token[]
}

export function compileUseFactory<V extends Value = Value>({
  useFactory,
  inject,
}: UseFactory<V>): Factory<V> {
  // Clone to prevent mutation
  const tokens: Token[] = inject ? [...inject] : []
  return (injector) => useFactory(...tokens.map(injector.get, injector))
}
