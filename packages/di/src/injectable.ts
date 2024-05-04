import 'reflect-metadata'
import {
  Injectable,
  InjectableToken,
  Token,
  Value,
  asInjectable,
  buildFactory,
} from './injector.js'

export function overrideToken<V extends Value = Value>(
  token: Token<V>,
  override: InjectableToken<V>
) {
  return asInjectable(token, buildFactory(override))
}

export function abstractToken<T>() {
  abstract class AbstractValue {
    abstract value: T

    static inject(value: T): Injectable<AbstractValue> {
      class Value extends this {
        static override get name() {
          return super.name // Improves debugging
        }
        get value() {
          return value
        }
      }
      return [this, buildFactory(Value)]
    }
  }
  return AbstractValue
}
