export type Value = object
export type Token<V extends Value = Value> = abstract new (...args: any[]) => V
export type Factory<V extends Value = Value> = (injector: Injector) => V

export type Instantiable<V extends Value = Value> = new (...args: any[]) => V
export type Definition<V extends Value = Value> = readonly [
  token: Token<V>,
  factory: Factory<V>,
]

export class Injector {
  protected factories: Map<Token, Factory>

  constructor(
    definitions?: Iterable<Definition | Instantiable>,
    protected parent?: Injector
  ) {
    this.factories = new Map<Token, Factory>(asDefinitions(definitions))
  }

  fork(definitions?: Iterable<Definition | Instantiable>) {
    return new Injector(definitions, this)
  }

  instantiating = new Map<
    Token,
    {
      dependencies: Set<Token>
    }
  >()
  instances = new Map<
    Token,
    {
      dependencies: Set<Token>
      value: Value
      priority: number
    }
  >()

  find<V extends Value>(token: Token<V>): V | undefined {
    let injector: Injector | undefined = this
    do {
      let injectorInstance = injector.instances.get(token)
      if (!injectorInstance) continue

      // If any child injector has a different factory for the value or any of
      // its dependencies, we need to re-instantiate the value so that the
      // correct factory is used.

      let ancestor: Injector = this
      while (ancestor !== injector) {
        if (ancestor.factories.has(token)) return undefined
        for (const dep of injectorInstance.dependencies) {
          if (ancestor.factories.has(dep)) return undefined
        }
        ancestor = ancestor.parent!
      }

      // All values being instantiates need to be marked as dependents
      // of all the dependents of the current value
      for (const inst of this.instantiating.values()) {
        for (const DepToken of injectorInstance.dependencies) {
          inst.dependencies.add(DepToken)
        }
      }

      return injectorInstance.value as V
    } while ((injector = injector.parent))

    return undefined
  }

  get<V extends Value>(token: Token<V>): V {
    if (this.instantiating.has(token)) {
      throw new Error(
        `Circular dependency detected for ${stringifyToken(token)}`
      )
    }

    const current = this.find(token)
    if (current) return current

    // Find the first ancestor that has a factory for the token

    let injector: Injector | undefined = this
    let factory: Factory<V> | undefined
    do {
      factory = injector.factories.get(token) as Factory<V> | undefined
      if (factory) break
    } while ((injector = injector.parent))

    if (!factory) {
      throw new Error(`No factory for ${stringifyToken(token)}`)
    }

    const dependencies = new Set<Token>([])
    this.instantiating.set(token, { dependencies })
    try {
      // Add the current token as a dependency of all the values being
      // instantiated
      for (const inst of this.instantiating.values()) {
        inst.dependencies.add(token)
      }

      const value = factory(this)

      // Store the value the oldest ancestor, up to the "injector" that defines
      // the factory, that has no child injector with a factory for the value or
      // any of its dependencies.

      let ancestor: Injector = this
      ancestor: while (ancestor !== injector) {
        if (ancestor.factories.has(token)) break ancestor
        for (const dep of dependencies) {
          if (ancestor.factories.has(dep)) break ancestor
        }
        ancestor = ancestor.parent!
      }

      ancestor.instances.set(token, {
        dependencies,
        value,
        // Make sure the value will be disposed before any other value that was
        // instantiated before it.
        priority: ancestor.instances.size,
      })

      return value
    } finally {
      this.instantiating.delete(token)
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

function* asDefinitions(
  iterable?: Iterable<Instantiable | Definition>
): Generator<Definition> {
  if (iterable) {
    for (const item of iterable) {
      yield typeof item === 'function' ? define(item) : item
    }
  }
}

export function define<V extends Value = Value>(
  token: Token<V>,
  factory: Factory<V>
): Definition<V>
export function define<V extends Value = Value>(
  token: Instantiable<V>
): Definition<V>
export function define<V extends Value = Value>(
  token: Token<V>,
  factory: Factory<V> = buildFactory(token as Instantiable<V>)
): Definition<V> {
  return [token, factory]
}

export function buildFactory<V extends Value = Value>(
  token: Instantiable<V>
): Factory<V> {
  const factory = Reflect.getMetadata('injectable:factory', token)
  if (factory) return factory

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

export function stringifyToken(token: Token) {
  return typeof token === 'function' ? token.name : String(token)
}
