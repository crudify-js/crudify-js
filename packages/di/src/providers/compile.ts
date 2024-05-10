import 'reflect-metadata'

import { Token, Value } from '../token.js'
import { Factory } from './factory.js'
import { Instantiable } from './instantiable.js'
import { UseClass, compileUseClass } from './use-class.js'
import { UseExisting, compileUseExisting } from './use-existing.js'
import { UseFactory, compileUseFactory } from './use-factory.js'
import { UseMethod, compileUseMethod } from './use-method.js'
import { UseValue, compileUseValue } from './use-value.js'
import { stringify } from '../util/stringify.js'

export type ProviderOptions<V extends Value = Value> = {
  provide: Token<V>
} & (UseFactory<V> | UseClass<V> | UseMethod<V> | UseExisting<V> | UseValue<V>)

export function* compileProviders(
  iterable?: Iterable<Instantiable | ProviderOptions>
): Generator<[Token, Factory]> {
  if (iterable) {
    for (const item of iterable) {
      yield compileProvider(item)
    }
  }
}

function compileProvider<V extends Value = Value>(
  provider: Instantiable<V> | ProviderOptions<V>
): [token: Token<V>, factory: Factory<V>] {
  const options: ProviderOptions<V> =
    typeof provider === 'function'
      ? { provide: provider, useClass: provider }
      : provider

  const { provide } = options

  try {
    if ('useClass' in options) {
      return [provide, compileUseClass(options)]
    }

    if ('useExisting' in options) {
      return [provide, compileUseExisting(options)]
    }

    if ('useFactory' in options) {
      return [provide, compileUseFactory(options)]
    }

    if ('useMethod' in options) {
      return [provide, compileUseMethod(options)]
    }

    if ('useValue' in options) {
      return [provide, compileUseValue(options)]
    }

    throw new TypeError('Invalid provider')
  } catch (cause) {
    throw new TypeError(`Unable to compile provider: ${stringify(provide)}`, {
      cause,
    })
  }
}
