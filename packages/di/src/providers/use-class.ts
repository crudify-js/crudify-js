import { assertInjectable } from '../decorators/injectable.js'
import { Value } from '../token.js'
import { Factory, buildFactories, invokeCreate } from './factory.js'
import { Instantiable } from './instantiable.js'

export type UseClass<V extends Value = Value> = {
  useClass: Instantiable<V>
}

export function compileUseClass<V extends Value = Value>({
  useClass,
}: UseClass<V>): Factory<V> {
  assertInjectable(useClass)

  const factories = buildFactories(useClass)
  if (!factories) throw new TypeError(`useClass argument must be a class.`)

  return {
    dispose: true,
    create: (injector) => {
      const args = factories.map(invokeCreate, injector)
      return new useClass(...args)
    },
  }
}
