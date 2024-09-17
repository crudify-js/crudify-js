import { createServer } from 'node:http'
import 'reflect-metadata'

import { asHandler, startServer } from '@crudify-js/http'
import {
  isInjectable,
  Injectable,
  Injector,
  Instantiable,
  Provider,
  Token,
  Value,
} from '@crudify-js/di'
import { run } from '@crudify-js/process'
import { Router } from '@crudify-js/di-router'
import { combineMiddlewares, Handler } from '@crudify-js/http'

export type ModuleOptions = {
  controllers?: Iterable<Instantiable>
  provides?: Iterable<Provider>
  exports?: Iterable<Provider | Token | Instantiable>
  imports?: Iterable<Instantiable | DynamicModule>
}

export type DynamicModule = ModuleOptions & {
  module: Instantiable
}

const makeInjectable = Injectable()

export function Module(options: ModuleOptions = {}) {
  return function (Target: Instantiable) {
    Reflect.defineMetadata('di:module', options, Target)
    makeInjectable(Target)
  }
}

export async function bootstrap(Module: Instantiable, port: number = 4001) {
  await using app = new AppContext(Module)

  await run(async (signal) => {
    await app.listen(port, signal)
  })
}

class ModuleContext {
  readonly parents: ModuleContext[]
  readonly injector: Injector
  readonly router?: Router

  constructor(def: Instantiable | DynamicModule) {
    const modules: Instantiable[] = []
    const [Module, options] = parseModule(def)

    this.parents = Array.from(options.imports || [], (def) => new Mod())

    const { controllers, provides } = options

    const providers = flat(provides, [{ provide: Module, useClass: Module }])

    this.injector = new Injector(providers, parent?.injector)
    this.router = controllers
      ? new Router({ controllers, injector: this.injector })
      : undefined
  }

  get handler(): Handler {
    return asHandler(
      combineMiddlewares([this.router?.handler, this.parent?.handler]),
    )
  }

  async [Symbol.asyncDispose]() {
    try {
      await this.router?.[Symbol.asyncDispose]()
    } finally {
      try {
        await this.injector[Symbol.asyncDispose]()
      } finally {
        await this.parent?.[Symbol.asyncDispose]()
      }
    }
  }
}

export class AppContext {
  readonly #moduleContext: ModuleContext

  constructor(Module: Instantiable) {
    this.#moduleContext = new ModuleContext(Module)
  }

  get<V extends Value>(token: Token<V>): V {
    return this.injector.get(token)
  }

  get injector() {
    // Expose the public injector of the root module
    return this.#moduleContext.injector
  }

  get handler() {
    // Expose the handler of the root module
    return this.#moduleContext.handler
  }

  async listen(port: number, signal?: AbortSignal) {
    // TODO: this server should be closed when this app is disposed
    const server = createServer(this.handler)
    if (signal) await startServer(signal, server, port)
    else await run(async (signal) => startServer(signal, server, port))
  }

  async [Symbol.asyncDispose]() {
    await this.#moduleContext[Symbol.asyncDispose]()
  }
}

export function* enumerateModules(
  def: Instantiable | DynamicModule,
): Generator<ParsedModule> {
  // Depth first enumeration of modules
  const parsed = parseModule(def)

  const [, { imports }] = parsed
  if (imports) {
    for (const module of imports) {
      yield* enumerateModules(module)
    }
  }

  yield parsed
}

type ParsedModule = [module: Instantiable, options: ModuleOptions]
function parseModule(def: Instantiable | DynamicModule): ParsedModule {
  if (typeof def === 'function') {
    assertModule(def)
    const options = Reflect.getMetadata('di:module', def)
    return [def, options]
  } else {
    assertModule(def.module)
    return [def.module, def]
  }
}

function isModule(value: Function): value is Instantiable {
  return isInjectable(value) && Reflect.hasMetadata('di:module', value)
}

export function assertModule(value: Function): asserts value is Instantiable {
  if (!isModule(value)) {
    const name = typeof value === 'function' ? value.name : String(value)
    throw new TypeError(`${name} is not a module.`)
  }
}

export function* flat<T>(
  ...iterables: (null | undefined | Iterable<T>)[]
): Iterable<T> {
  for (const iterable of iterables) {
    if (iterable != null) yield* iterable
  }
}
