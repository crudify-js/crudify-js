import { Token, Value } from '../token.js'
import { stringify } from '../util/stringify.js'
import { Factory } from './factory.js'

export type UseFactory<V extends Value = Value> = {
  useFactory: (...args: any[]) => V
  autoDispose?: boolean
  inject?: Token[]
}

export function compileUseFactory<V extends Value = Value>(
  options: UseFactory<V>,
): Factory<V> {
  const { useFactory, inject, autoDispose = true } = options

  // Clone to prevent mutation
  const tokens: Token[] = inject ? [...inject] : []

  if (useFactory.length > tokens.length) {
    const name = stringify('provide' in options ? options.provide : useFactory)
    throw new TypeError(
      `Missing inject token for argument ${tokens.length} of useFactory ${name}`,
    )
  }

  return {
    autoDispose,
    create: (injector) => useFactory(...tokens.map(injector.get, injector)),
  }
}
