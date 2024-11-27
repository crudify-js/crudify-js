import { assertInjectable } from '../decorators/injectable.js'
import { Value } from '../token.js'
import { isObject } from '../util/is-object.js'
import { stringify } from '../util/stringify.js'
import { buildArguments } from './arguments.js'
import { Factory } from './factory.js'
import { Instantiable } from './instantiable.js'

export type UseMethod<V extends Value = Value> = {
  useMethod: Instantiable<V>
  methodName: string | symbol
}

export function compileUseMethod<V extends Value = Value>({
  useMethod,
  methodName,
}: UseMethod<V>): Factory<V & Function> {
  assertInjectable(useMethod)

  const getArgs = buildArguments(useMethod.prototype, methodName)
  if (!getArgs) throw new TypeError(`useMethod argument must be a class.`)

  return {
    autoDispose: false,
    create: (injector) => {
      const object = injector.get(useMethod)
      if (!isObject(object)) {
        throw new TypeError(`Invalid object ${stringify(object)}`)
      }

      const method =
        methodName in object ? object[methodName as keyof V] : undefined
      if (typeof method !== 'function') {
        throw new TypeError(
          `Method ${String(methodName)} not found in ${stringify(useMethod)}`,
        )
      }

      const injectedArgs = getArgs(injector)

      // @TODO (?) we could provide a special injection token allowing the method to capture
      // the the extra arguments that are passed to the function when called. We could also
      // simply append those extra agruments to the list of injected arguments.
      const value = (..._extraAgrs: unknown[]): unknown =>
        method.call(object, ...injectedArgs)

      return value as V & Function
    },
  }
}
