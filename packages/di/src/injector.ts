import { Token, Value, getTokens, stringify } from './token.js'

export type { Token, Value }
export type Factory<V extends Value = Value> = (injector: Injector) => V

export type Instantiable<V extends Value = Value> = new (...args: any[]) => V
export type Definition<V extends Value = Value> = readonly [
  token: Token<V>,
  factory: Factory<V>,
]

function throwParentDisposedBeforeChildren() {
  throw new Error(
    'Parent injector was disposed. Make sure to dispose all child injector(s) before disposing the parent injector.'
  )
}

export class Injector {
  #disposed = false
  #disposeListeners: (() => void | Promise<void>)[] = []
  #disposeStack: (() => void | Promise<void>)[] = []

  #instantiating = new Map<
    Token,
    {
      dependencies: Set<Token>
    }
  >()

  readonly factories: ReadonlyMap<Token, Factory>
  protected instances = new Map<
    Token,
    {
      dependencies: Set<Token>
      value: Value
    }
  >()

  constructor(
    definitions?: Iterable<Definition | Instantiable>,
    protected parent?: Injector
  ) {
    this.factories = new Map<Token, Factory>(asDefinitions(definitions))

    if (parent) {
      const unListen = parent.onDispose(throwParentDisposedBeforeChildren)
      this.onDispose(unListen)
    }
  }

  onDispose(dispose: () => void | Promise<void>): () => void {
    this.throwIfDisposed()
    this.#disposeListeners.push(dispose)
    let called = false
    return () => {
      if (called) return
      called = true
      const index = this.#disposeListeners.indexOf(dispose)
      if (index !== -1) this.#disposeListeners.splice(index, 1)
    }
  }

  throwIfDisposed() {
    if (this.#disposed) throw new Error('Injector is disposed')
  }

  throwIfInstantiating(token?: Token) {
    if (token) {
      if (this.#instantiating.has(token)) {
        throw new Error(`Circular dependency detected for ${stringify(token)}`)
      }
    } else if (this.#instantiating.size) {
      throw new Error('Injector is instantiating')
    }
  }

  fork(definitions?: Iterable<Definition | Instantiable>) {
    return new Injector(definitions, this)
  }

  find<V extends Value>(token: Token<V>): V | undefined {
    this.throwIfDisposed()
    this.throwIfInstantiating(token)

    let injector: Injector | undefined = this
    do {
      let injectorInstance = injector.instances.get(token)
      if (!injectorInstance) continue

      // The "injector" (which can be "this" or an ancestor) contains a value
      // for the token.

      const { value, dependencies } = injectorInstance

      // We now need to:

      // 1) Ensure that no child of the "injector" (if any) has a different
      //    factory for the value or any of its dependencies. If they do, we
      //    need to re-instantiate the value using the correct factory. We do
      //    this be returning "undefined", as if the value was not found.

      let ancestor: Injector = this
      while (ancestor !== injector) {
        if (ancestor.definesToken(token)) return undefined
        if (ancestor.definesTokens(dependencies)) return undefined

        ancestor = ancestor.parent!
      }

      // 2) Mark the "token" as dependency of all the values currently being
      //    instantiated.

      for (const inst of this.#instantiating.values()) {
        for (const DepToken of dependencies) {
          inst.dependencies.add(DepToken)
        }
      }

      return value as V
    } while ((injector = injector.parent))

    return undefined
  }

  definesToken(token: Token) {
    return this.factories.has(token)
  }

  definesTokens(tokens: Iterable<Token>) {
    for (const token of tokens) if (this.definesToken(token)) return true
    return false
  }

  get<V extends Value>(token: Token<V>): V {
    // These checks are already done in this.find()
    // this.throwIfDisposed()
    // this.throwIfInstantiating(token)

    const current = this.find(token)
    if (current) return current

    // Find the first ancestor that has a factory for the token

    let factoryInjector: Injector | undefined = this
    let factory: Factory<V> | undefined
    do {
      factory = factoryInjector.factories.get(token) as Factory<V> | undefined
    } while (!factory && (factoryInjector = factoryInjector.parent))

    if (!factory || !factoryInjector) {
      throw new Error(`No factory for ${stringify(token)}`)
    }

    const dependencies = new Set<Token>([])
    this.#instantiating.set(token, { dependencies })
    try {
      // Add the current token as a dependency of all the values currently being
      // instantiated
      for (const inst of this.#instantiating.values()) {
        inst.dependencies.add(token)
      }

      const value = factory(this)

      // Store the value the oldest ancestor, up to the "factoryInjector" that
      // defines the factory, that has no child injector with a factory for the
      // value or any of its dependencies.

      let ancestor: Injector = this
      while (ancestor !== factoryInjector) {
        if (ancestor.definesToken(token)) break
        if (ancestor.definesTokens(dependencies)) break
        ancestor = ancestor.parent!
      }

      ancestor.instances.set(token, {
        dependencies,
        value,
      })

      if (typeof value === 'object' && value !== null) {
        const dispose =
          (Symbol.dispose in value && value[Symbol.dispose]) ||
          (Symbol.asyncDispose in value && value[Symbol.asyncDispose])
        if (typeof dispose === 'function') {
          this.#disposeStack.push(dispose.bind(value))
        }
      }

      return value
    } finally {
      this.#instantiating.delete(token)
    }
  }

  async [Symbol.asyncDispose]() {
    // we *could* silently ignore this, but it's better to ensure that the user
    // always ensures that the dispose function is called once, and only once.
    this.throwIfDisposed()
    this.throwIfInstantiating()

    this.#disposed = true
    this.instances.clear()

    const results = await Promise.allSettled(
      this.#disposeListeners
        .splice(0, Infinity)
        .map(async (dispose) => dispose())
    )

    const listenerErrors = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r) => r.reason)

    // Dispose every disposable in reverse order
    const disposeErrors: unknown[] = []
    for (const dispose of this.#disposeStack.splice(0, Infinity).reverse()) {
      try {
        await dispose()
      } catch (error) {
        disposeErrors.push(error)
      }
    }

    const errors = [...listenerErrors, ...disposeErrors]
    if (errors.length) {
      const message = 'An error occurred while disposing the injector.'
      throw new AggregateError(errors, message)
    }
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
  factory: Factory<V> = asFactory(token as Instantiable<V>)
): Definition<V> {
  return [token, factory]
}

export function asFactory<V extends Value = Value>(
  token: Instantiable<V>
): Factory<V> {
  // Custom factory defined by the @Injectable decorator
  const factory = Reflect.getMetadata('injectable:factory', token)
  if (factory) return factory

  const tokens = getTokens(token)
  return (injector) => {
    const args = tokens.map((type) => injector.get(type))
    return new token(...args)
  }
}
