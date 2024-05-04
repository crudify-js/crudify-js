import { Factory, Injectable, InjectableToken, Token, Value } from './types.js'
import { asInjectables, stringifyToken } from './util.js'

export class Injector {
  protected factories: Map<Token, Factory>

  constructor(
    injectables?: Iterable<Injectable | InjectableToken>,
    protected parent?: Injector
  ) {
    this.factories = new Map<Token, Factory>(asInjectables(injectables))

    for (const token of this.factories.keys()) {
      if (parent?.hasFactory(token)) {
        throw new TypeError(
          `${stringifyToken(token)} already exists in parent injector`
        )
      }
    }
  }

  fork(injectables?: Iterable<Injectable | InjectableToken>) {
    return new Injector(injectables, this)
  }

  private hasFactory<V extends Value>(
    token: Token<V>
  ): undefined | { injector: Injector; factory: Factory<V> } {
    const factory = this.factories.get(token) as Factory<V> | undefined
    if (factory) return { injector: this, factory }

    const parentRecipe = this.parent?.hasFactory(token)
    if (parentRecipe) return parentRecipe

    return undefined
  }

  private getFactory<V extends Value>(
    token: Token<V>
  ): { injector: Injector; factory: Factory<V> } {
    const result = this.hasFactory(token)
    if (result) return result

    throw new Error(`No factory for ${stringifyToken(token)}`)
  }

  private getValue<V extends Value>(
    token: Token<V>
  ):
    | {
        value: V
        dependents: Set<Injector>
      }
    | undefined {
    const current = this.instances.get(token)
    if (current) {
      const { value, dependents } = current
      return { value: value as V, dependents }
    }

    return this.parent?.getValue(token)
  }

  instantiating = new Map<
    Token,
    {
      dependents: Set<Injector>
    }
  >()
  instances = new Map<
    Token,
    {
      priority: number
      value: Value
      dependents: Set<Injector>
    }
  >()

  get<V extends Value>(token: Token<V>): V {
    if (token === (Injector as Token)) return this as unknown as V

    const current = this.getValue(token)
    if (current) {
      // All values being instantiates need to be marked as dependents
      // of all the dependents of the current value
      for (const { dependents } of this.instantiating.values()) {
        for (const injector of current.dependents) {
          dependents.add(injector)
        }
      }
      return current.value
    }

    const { factory, injector } = this.getFactory(token)

    if (this.instantiating.has(token)) {
      throw new Error(
        `Circular dependency detected for ${stringifyToken(token)}`
      )
    }

    const dependents = new Set<Injector>([])
    this.instantiating.set(token, { dependents })
    try {
      for (const { dependents } of this.instantiating.values()) {
        dependents.add(injector)
      }
      const value = factory(this)
      this.set(token, value, dependents)
      return value
    } finally {
      this.instantiating.delete(token)
    }
  }

  private set<V extends Value>(
    token: Token<V>,
    value: V,
    dependents: Set<Injector>
  ): void {
    if (this.factories.has(token) || dependents.has(this)) {
      this.instances.set(token, {
        priority: this.instances.size,
        value,
        dependents,
      })
    } else {
      this.parent!.set(token, value, dependents)
    }
  }

  async [Symbol.asyncDispose]() {
    const errors: unknown[] = []
    const instances = Array.from(this.instances.values())
      .sort((a, b) => b.priority - a.priority)
      .map((v) => v.value)
    this.instances.clear()
    for (const instance of instances) {
      try {
        if (Symbol.dispose in instance) {
          ;(instance as Disposable)[Symbol.dispose]()
        } else if (Symbol.asyncDispose in instance) {
          await (instance as AsyncDisposable)[Symbol.asyncDispose]()
        }
      } catch (error) {
        errors.push(error)
      }
    }

    if (this.instances.size)
      throw new Error('New instances were added during dispose')
    if (errors.length === 1) throw errors[0]
    if (errors.length > 1) throw new AggregateError(errors, 'Failed to dispose')
  }
}
