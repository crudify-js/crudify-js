import { compileProviders } from './providers/compile.js'
import { Factory, FactoryInjector } from './providers/factory.js'
import { Provider } from './providers/provider.js'
import { Token, Value } from './token.js'
import { allFulfilled } from './util/all-fulfilled.js'
import { AsyncDisposableStack } from './util/disposable.js'
import { once } from './util/once.js'
import { stringify } from './util/stringify.js'

export class Injector implements AsyncDisposable, FactoryInjector {
  #disposeListeners: (() => void | Promise<void>)[] = []
  #disposableStack = new AsyncDisposableStack()

  #factories: Map<Token, Factory>

  #instantiating = new Map<Token, { dependencies: Set<Token> }>()
  #instances = new Map<Token, { dependencies: Set<Token>; value: Value }>()

  constructor(
    providers?: Iterable<Provider>,
    protected parent?: Injector,
  ) {
    this.#factories = compileProviders(providers)
    if (parent) {
      const unListen = parent.onDispose(throwParentDisposedBeforeChildren)
      this.onDispose(unListen)
    }
  }

  get disposed() {
    return this.#disposableStack.disposed
  }

  get isInstantiating(): boolean {
    return this.#instantiating.size > 0
  }

  throwIfDisposed() {
    if (this.disposed) throw new Error('Injector is disposed')
  }

  onDispose(listener: () => void | Promise<void>): () => void {
    this.throwIfDisposed()
    this.#disposeListeners.push(listener)

    const removeDisposeListener = () => {
      const index = this.#disposeListeners.indexOf(listener)
      if (index !== -1) this.#disposeListeners.splice(index, 1)
    }

    return once(removeDisposeListener)
  }

  fork(providers?: Iterable<Provider>) {
    return new Injector(providers, this)
  }

  find<V extends Value>(token: Token<V>): V | undefined {
    this.throwIfDisposed()

    if (this.#instantiating.has(token)) {
      throw new Error(`Circular dependency detected for ${stringify(token)}`)
    }

    let injector: Injector | undefined = this
    do {
      let injectorInstance = injector.#instances.get(token)
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

      // 2) Add all the dependencies of the value to the list of dependencies of
      //    all the values currently being instantiated.

      for (const inst of this.#instantiating.values()) {
        for (const token of dependencies) {
          inst.dependencies.add(token)
        }
      }

      return value as V
    } while ((injector = injector.parent))

    return undefined
  }

  definesToken(token: Token) {
    return this.#factories.has(token)
  }

  definesTokens(tokens: Iterable<Token>) {
    for (const token of tokens) if (this.definesToken(token)) return true
    return false
  }

  get<V extends Value>(
    token: Token<V>,
    options: { optional: true },
  ): V | undefined
  get<V extends Value>(token: Token<V>, options?: { optional?: false }): V
  get<V extends Value>(
    token: Token<V>,
    options?: { optional?: boolean },
  ): V | undefined {
    const current = this.find(token)
    if (current) return current

    // Find the first ancestor that has a factory for the token

    let factoryInjector: Injector | undefined = this
    let factory: Factory<V> | undefined
    do {
      factory = factoryInjector.#factories.get(token) as Factory<V> | undefined
    } while (!factory && (factoryInjector = factoryInjector.parent))

    if (!factory || !factoryInjector) {
      if (options?.optional === true) return undefined
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

      const value = factory.create(this)

      // Store the value the oldest ancestor, up to the "factoryInjector" that
      // defines the factory, that has no child injector with a factory for the
      // token or any of its dependencies.

      let ancestor: Injector = this
      while (ancestor !== factoryInjector) {
        if (ancestor.definesToken(token)) break
        if (ancestor.definesTokens(dependencies)) break
        ancestor = ancestor.parent!
      }

      ancestor.#instances.set(token, {
        dependencies,
        value,
      })

      if (factory.autoDispose) {
        this.#disposableStack.use(value)
      }

      return value
    } finally {
      this.#instantiating.delete(token)
    }
  }

  *[Symbol.iterator](): Iterator<Token> {
    yield* this.#factories.keys()
    if (this.parent) {
      for (const token of this.parent) {
        if (!this.#factories.has(token)) {
          yield token
        }
      }
    }
  }

  async [Symbol.asyncDispose]() {
    if (this.disposed) return

    if (this.isInstantiating) {
      throw new Error('Injector cannot be disposed while instantiating values')
    }

    const errors = []
    try {
      await allFulfilled(
        this.#disposeListeners.splice(0, Infinity).map(execAsync),
        'An error occurred during onDispose listeners execution',
      )
    } catch (error) {
      errors.push(error)
    }

    try {
      await this.#disposableStack[Symbol.asyncDispose]()
    } catch (error) {
      errors.push(error)
    } finally {
      // Allow these to be GC'd, even if this class is still referenced
      this.#factories.clear()
      this.#instances.clear()
    }

    if (errors.length) {
      const message = 'An error occurred while disposing the injector.'
      throw new AggregateError(errors, message)
    }
  }
}

async function execAsync(fn: () => void | Promise<void>) {
  await fn()
}

function throwParentDisposedBeforeChildren() {
  throw new Error(
    'Parent injector was disposed. Make sure to dispose all child injector(s) before disposing the parent injector.',
  )
}
