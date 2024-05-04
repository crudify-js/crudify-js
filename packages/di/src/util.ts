import 'reflect-metadata'
import { Factory, Injectable, InjectableToken, Token, Value } from './types.js'

export function stringifyToken(token: Token) {
  return typeof token === 'function' ? token.name : String(token)
}

export function* asInjectables(
  iterable?: Iterable<InjectableToken | Injectable>
): Generator<Injectable> {
  if (iterable) {
    for (const item of iterable) {
      yield typeof item === 'function' ? asInjectable(item) : item
    }
  }
}

export function asInjectable<V extends Value = Value>(
  token: Token<V>,
  factory: (..._: any[]) => V
): Injectable<V>
export function asInjectable<V extends Value = Value>(
  token: InjectableToken<V>
): Injectable<V>
export function asInjectable<V extends Value = Value>(
  token: Token<V>,
  factory: (..._: any[]) => V = buildFactory(token as InjectableToken<V>)
): Injectable<V> {
  return [token, factory]
}

export function buildFactory<V extends Value = Value>(
  token: InjectableToken<V>
): Factory<V> {
  const types: undefined | Token[] = Reflect.getMetadata(
    'design:paramtypes',
    token
  )

  if (types) {
    return types.length === 0
      ? () => new token()
      : (injector) => {
          const args = types.map((type) => injector.get(type))
          return new token(...args)
        }
  }

  if (token.length === 0) {
    return () => new token()
  }

  throw new Error(`${stringifyToken(token)} is not injectable`)
}

export function overrideInjectable<V extends Value = Value>(
  token: Token<V>,
  override: InjectableToken<V>
) {
  return asInjectable(token, buildFactory(override))
}

export function abstractToken<T>() {
  abstract class AbstractValue {
    abstract value: T
    valueOf() {
      return this.value
    }
    toJSON() {
      return this.value
    }
    static inject(value: T): Injectable<AbstractValue> {
      class Value extends this {
        static override get name() {
          return super.name // Improves debugging
        }
        get value() {
          return value
        }
      }
      return [this, (injector) => new Value()]
    }
  }
  return AbstractValue
}
