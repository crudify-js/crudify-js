import { assertInjectable } from '../decorators/injectable.js'
import { Value } from '../token.js'
import { stringify } from '../util/stringify.js'
import { Factory, buildFactories } from './factory.js'
import { Instantiable } from './instantiable.js'

export type UseMethod<V extends Value = Value> = {
  useMethod: Instantiable<V>
  methodName: string | symbol
}

export function compileUseMethod<V extends Value = Value>({
  useMethod,
  methodName,
}: UseMethod<V>): Factory<V> {
  assertInjectable(useMethod)

  const factories = buildFactories(useMethod.prototype, methodName)
  if (!factories) throw new TypeError(`useMethod argument must be a class.`)

  return (injector) => {
    const object = injector.get(useMethod)
    if (object == null || typeof object !== 'object') {
      throw new TypeError(`Invalid object ${stringify(object)}`)
    }
    const method =
      methodName in object
        ? (object as Record<typeof methodName, unknown>)[methodName]
        : undefined
    if (typeof method !== 'function') {
      throw new TypeError(
        `Method ${String(methodName)} not found in ${stringify(useMethod)}`
      )
    }
    const args = factories.map(invokeWithThisAsFirstArg, injector)
    return method.bind(object, ...args)
  }
}

function invokeWithThisAsFirstArg<T, R>(this: T, fn: (arg: T) => R): R {
  return fn(this)
}
