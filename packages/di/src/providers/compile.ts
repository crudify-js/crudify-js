import 'reflect-metadata'

import { Token, Value } from '../token.js'
import { stringify } from '../util/stringify.js'
import { Factory } from './factory.js'
import { Instantiable } from './instantiable.js'
import { UseClass, compileUseClass } from './use-class.js'
import { UseExisting, compileUseExisting } from './use-existing.js'
import { UseFactory, compileUseFactory } from './use-factory.js'
import { UseMethod, compileUseMethod } from './use-method.js'
import { UseValue, compileUseValue } from './use-value.js'

export type ProviderOptions<V extends Value = Value> = {
  provide: Token<V>
} & (UseFactory<V> | UseClass<V> | UseMethod<V> | UseExisting<V> | UseValue<V>)

export function compileProviders(
  iterable?: Iterable<Instantiable | ProviderOptions>,
): Map<Token, Factory> {
  const factories = new Map<Token, Factory>()
  if (iterable) {
    for (const item of iterable) {
      const { provide: token, factory } = compileProvider(item)
      if (factories.has(token)) {
        throw new TypeError(`Duplicate provider: ${stringify(token)}`)
      }

      factories.set(token, factory)
    }
  }
  return factories
}

export function getProviderToken<V extends Value = Value>(
  provider: Instantiable<V> | ProviderOptions<V>,
): Token<V> {
  return typeof provider === 'function' ? provider : provider.provide
}

function compileProvider<V extends Value = Value>(
  provider: Instantiable<V> | ProviderOptions<V>,
): { provide: Token<V>; factory: Factory<V> } {
  const options: ProviderOptions<V> =
    typeof provider === 'function'
      ? { provide: provider, useClass: provider }
      : provider

  const { provide } = options

  try {
    if ('useValue' in options) {
      return { provide, factory: compileUseValue(options) }
    }

    if ('useFactory' in options) {
      return { provide, factory: compileUseFactory(options) }
    }

    if ('useExisting' in options) {
      return { provide, factory: compileUseExisting(options) }
    }

    if ('useClass' in options) {
      return { provide, factory: compileUseClass(options) }
    }

    if ('useMethod' in options) {
      return { provide, factory: compileUseMethod(options) }
    }
  } catch (cause) {
    throw new TypeError(`Unable to compile provider: ${stringify(provide)}`, {
      cause,
    })
  }

  throw new TypeError(
    'Options must contain one of "useClass", "useExisting", "useFactory", "useMethod" or "useValue",',
  )
}
