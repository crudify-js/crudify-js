import { Token, Value, isToken } from './token.js'

import {
  getArrayMetadata,
  getDecoratedFunction,
  stringify,
  stringifyTarget,
} from './util.js'

// Not using Injector from "./injector.ts" to avoid circular dependency
interface FactoryInjector {
  get<T>(token: Token<T>): T
}

export type Factory<V extends Value = Value> = (injector: FactoryInjector) => V

export type Instantiable<V extends Value = Value> = new (...args: any[]) => V

type FactoryProvider<V extends Value = Value> = {
  provide: Token<V>
  useFactory: (...args: any[]) => V
  inject?: Token[]
}

export type ClassProvider<V extends Value = Value> = {
  provide: Token<V>
  useClass: Instantiable<V>
}

export type MethodProvider<V extends Value = Value> = {
  provide: Token<V>
  useMethod: Instantiable<V>
  methodName: string | symbol
}

export type ExistingProvider<V extends Value = Value> = {
  provide: Token<V>
  useExisting: Token<V>
}

export type ValueProvider<V extends Value = Value> = {
  provide: Token<V>
  useValue: V
}

export type Provider<V extends Value = Value> =
  | Instantiable<V>
  | FactoryProvider<V>
  | ClassProvider<V>
  | MethodProvider<V>
  | ExistingProvider<V>
  | ValueProvider<V>

export function* compileProviders(
  iterable?: Iterable<Instantiable | Provider>
): Generator<[Token, Factory]> {
  if (iterable) {
    for (const item of iterable) {
      yield compileProvider(item)
    }
  }
}

export function compileProvider<V extends Value = Value>(
  provider: Provider<V>
): [token: Token<V>, factory: Factory<V>] {
  if (typeof provider === 'function') {
    // Instantiable<V>
    return compileProvider({ provide: provider, useClass: provider })
  }

  if ('useValue' in provider) {
    return [provider.provide, compileValueProvider(provider)]
  }

  if ('useExisting' in provider) {
    return [provider.provide, compileExistingProvider(provider)]
  }

  if ('useFactory' in provider) {
    return [provider.provide, compileFactoryProvider(provider)]
  }

  if ('useClass' in provider) {
    return [provider.provide, compileClassProvider(provider)]
  }

  if ('useMethod' in provider) {
    return [provider.provide, compileMethodProvider(provider)]
  }

  throw new TypeError('Invalid provider')
}

export function compileValueProvider<V extends Value = Value>({
  useValue,
}: Omit<ValueProvider<V>, 'provide'>): Factory<V> {
  return () => useValue
}

export function compileExistingProvider<V extends Value = Value>({
  useExisting,
}: Omit<ExistingProvider<V>, 'provide'>): Factory<V> {
  return (injector) => injector.get(useExisting)
}

export function compileFactoryProvider<V extends Value = Value>({
  useFactory,
  inject,
}: Omit<FactoryProvider<V>, 'provide'>): Factory<V> {
  // Clone to prevent mutation
  const tokens: Token[] = inject ? [...inject] : []
  return (injector) => useFactory(...tokens.map(injector.get, injector))
}

export function compileMethodProvider<V extends Value = Value>({
  useMethod,
  methodName,
}: Omit<MethodProvider<V>, 'provide'>): Factory<V> {
  const factories = buildFactories(useMethod.prototype, methodName)
  if (!factories) {
    throw new TypeError(`compileMethodProvider() must be used with a class.`)
  }

  return (injector) => {
    const object = injector.get(useMethod)
    if (object == null || typeof object !== 'object') {
      throw new TypeError(`Invalid object ${stringify(object)}`)
    }
    const method =
      methodName in object
        ? (object as Record<typeof methodName, unknown>)[methodName]
        : undefined
    if (typeof method !== 'function') {
      throw new TypeError(
        `Method ${String(methodName)} not found in ${stringify(useMethod)}`
      )
    }
    const args = factories.map(invokeWithThisAsFirstArg, injector)
    return method.bind(object, ...args)
  }
}

export function compileClassProvider<V extends Value = Value>({
  useClass,
}: Omit<ClassProvider<V>, 'provide'>): Factory<V> {
  const factories = buildFactories(useClass)
  if (!factories) {
    throw new TypeError(`compileClassProvider() must be used with a class.`)
  }

  return (injector) => {
    const args = factories.map(invokeWithThisAsFirstArg, injector)
    return new useClass(...args)
  }
}

function invokeWithThisAsFirstArg<T, R>(this: T, fn: (arg: T) => R): R {
  return fn(this)
}

function buildFactories(
  target: Object,
  key?: string | symbol
): undefined | Factory[] {
  const types = getArrayMetadata<undefined | Function>(
    'design:paramtypes',
    target,
    key
  )
  const diFactories = getArrayMetadata<undefined | Factory>(
    'di:factories',
    target,
    key
  )

  const factories: Factory[] = []
  const item = getDecoratedFunction(target, key)
  if (!item) return undefined

  const length = Math.max(
    item.length,
    types?.length ?? 0,
    diFactories?.length ?? 0
  )

  for (let i = 0; i < length; i++) {
    const factory = diFactories?.[i]
    if (factory) {
      factories[i] = factory
      continue
    }

    const type = types?.[i]
    if (isToken(type)) {
      factories[i] = (injector) => injector.get(type)
      continue
    }

    const targetStr = stringifyTarget(target, key)
    throw new Error(
      `Unable to determine injection token for parameter ${i} of ${targetStr}.`
    )
  }

  return factories
}
