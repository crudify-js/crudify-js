import { Injectable } from '../decorators/injectable.js'
import { Value } from '../token.js'
import { Provider } from './provider.js'

// We use a function here to properly enforce the type constraint on the static
// methods. Otherwise, TypeScript would allow calling `provideValue` and
// `provideLazy` with any value, not just `T`.
export function valueProvider<T extends Value = Value>(): (abstract new () => {
  value: T
}) & {
  provideValue(value: T): Provider<ValueWrapper<T>>
  provideLazy(value: () => T): Provider<ValueWrapper<T>>
} {
  return ValueWrapper<T>
}

abstract class ValueWrapper<T> {
  abstract value: T

  static provideValue<T>(value: T): Provider<ValueWrapper<T>> {
    @Injectable()
    class Value extends this<T> {
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

  static provideLazy<T>(value: () => T): Provider<ValueWrapper<T>> {
    @Injectable()
    class Value extends this<T> {
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
