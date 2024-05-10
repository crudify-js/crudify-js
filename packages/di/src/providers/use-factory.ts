import { Token, Value } from '../token.js'
import { stringify } from '../util/stringify.js'
import { Factory } from './factory.js'

export type UseFactory<V extends Value = Value> = {
  useFactory: (...args: any[]) => V
  inject?: Token[]
}

export function compileUseFactory<V extends Value = Value>(
  options: UseFactory<V>
): Factory<V> {
  const { useFactory, inject } = options

  // Clone to prevent mutation
  const tokens: Token[] = inject ? [...inject] : []

  if (useFactory.length > tokens.length) {
    const name = stringify('provide' in options ? options.provide : useFactory)
    throw new TypeError(
      `Missing inject token for argument ${useFactory.length} of useFactory ${name}`
    )
  }

  // Optimization
  switch (tokens.length) {
    case 0:
      return () => useFactory()
    case 1:
      return (injector) => useFactory(injector.get(tokens[0]!))

    case 2:
      return (injector) =>
        useFactory(injector.get(tokens[0]!), injector.get(tokens[1]!))
    case 3:
      return (injector) =>
        useFactory(
          injector.get(tokens[0]!),
          injector.get(tokens[1]!),
          injector.get(tokens[2]!)
        )
    case 4:
      return (injector) =>
        useFactory(
          injector.get(tokens[0]!),
          injector.get(tokens[1]!),
          injector.get(tokens[2]!),
          injector.get(tokens[3]!)
        )
    default:
      return (injector) => useFactory(...tokens.map(injector.get, injector))
  }
}
