import { Token, Value } from '../token.js'

// Not using Injector from "../injector.ts" to avoid circular dependency
export interface FactoryInjector {
  get<V extends Value = Value>(token: Token<V>): V
}

export type Factory<V extends Value = Value> = {
  autoDispose: boolean
  create: (injector: FactoryInjector) => V
}
