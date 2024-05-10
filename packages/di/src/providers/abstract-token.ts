import { Injectable } from '../decorators/injectable.js'
import { Provider } from './provider.js'

export function abstractToken<T = unknown>() {
  abstract class AbstractValue {
    abstract value: T

    static provideValue(value: T): Provider<AbstractValue> {
      @Injectable()
      class Value extends this {
        value = value
        static override get name() {
          return super.name // Improves debugging
        }
      }

      return {
        provide: this,
        useClass: Value,
      }
    }

    static provideLazy(value: () => T): Provider<AbstractValue> {
      @Injectable()
      class Value extends this {
        static override get name() {
          return super.name // Improves debugging
        }
        get value() {
          const result = value()
          Object.defineProperty(this, 'value', {
            value: result,
            writable: false,
            enumerable: true,
            configurable: false,
          })
          return result
        }
      }

      Object.defineProperty(Value.prototype, 'value', { enumerable: true })

      return {
        provide: this,
        useClass: Value,
      }
    }
  }
  return AbstractValue
}
