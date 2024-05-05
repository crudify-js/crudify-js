import 'reflect-metadata'
import {
  Definition,
  Instantiable,
  Token,
  Value,
  define,
  asFactory,
} from './injector.js'

export function overrideToken<V extends Value = Value>(
  token: Token<V>,
  override: Instantiable<V>
) {
  return define(token, asFactory(override))
}

export function abstractToken<T>() {
  abstract class AbstractValue {
    abstract value: T

    static define(value: T): Definition<AbstractValue> {
      class Value extends this {
        static override get name() {
          return super.name // Improves debugging
        }
        get value() {
          return value
        }
      }
      return overrideToken(this, Value)
    }
  }
  return AbstractValue
}
