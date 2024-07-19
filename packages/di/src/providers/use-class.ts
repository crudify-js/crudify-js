import { assertInjectable } from '../decorators/injectable.js'
import { Value } from '../token.js'
import { buildArguments } from './arguments.js'
import { Factory } from './factory.js'
import { Instantiable } from './instantiable.js'

export type UseClass<V extends Value = Value> = {
  useClass: Instantiable<V>
}

export function compileUseClass<V extends Value = Value>({
  useClass,
}: UseClass<V>): Factory<V> {
  assertInjectable(useClass)

  const getArgs = buildArguments(useClass)
  if (!getArgs) throw new TypeError(`useClass argument must be a class.`)

  return {
    autoDispose: true,
    create: (injector) => {
      const args = getArgs(injector)
      return new useClass(...args)
    },
  }
}
