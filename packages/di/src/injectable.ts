import 'reflect-metadata'
import { Provider } from './providers.js'

export function abstractToken<T = unknown>() {
  abstract class AbstractValue {
    abstract value: T

    static provideValue(value: T): Provider<AbstractValue> {
      class Value extends this {
        static override get name() {
          return super.name // Improves debugging
        }
        get value() {
          return value
        }
      }
      return {
        provide: this,
        useClass: Value,
      }
    }
  }
  return AbstractValue
}

export function lazyToken<T = unknown>() {
  abstract class AbstractValue {
    abstract value: T

    static provideLazy(value: () => T): Provider<AbstractValue> {
      class Value extends this {
        #state?: { value: T }
        static override get name() {
          return super.name // Improves debugging
        }
        get value() {
          return (this.#state ??= { value: value() }).value
        }
      }
      return {
        provide: this,
        useClass: Value,
      }
    }
  }
  return AbstractValue
}
