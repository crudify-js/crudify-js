import { createServer } from 'node:http'

import { asHandler, startServer } from '@crudify-js/http'
import {
  assertInjectable,
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

import 'reflect-metadata'

export type ModuleOptions = {
  controllers?: Iterable<Instantiable>
  provides?: Iterable<Provider>
  exports?: Iterable<Provider | Token | Instantiable>
  imports?: Iterable<Instantiable>
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
  readonly injector: Injector
  readonly router?: Router

  constructor(
    readonly Module: Instantiable,
    readonly parent?: ModuleContext,
  ) {
    const { provides, controllers } = getModuleOptions(Module)

    const providers = combineIterables(
      [{ provide: Module, useClass: Module }],
      provides,
    )

    this.injector = new Injector(providers, parent?.injector)
    this.router = controllers
      ? new Router({ controllers, injector: this.injector })
      : undefined
  }

  get module() {
    return this.injector.get(this.Module)
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
    const modules: Instantiable[] = []

    for (const mod of enumerateModules(Module)) {
      if (!modules.includes(mod)) modules.push(mod)
    }

    this.#moduleContext = modules.reduce<undefined | ModuleContext>(
      (prev, Mod) => new ModuleContext(Mod, prev),
      undefined,
    )!
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

function* enumerateModules(Module: Instantiable): Generator<Instantiable> {
  // Depth first enumeration of modules
  const { imports } = getModuleOptions(Module)
  if (imports) {
    for (const module of imports) {
      yield* enumerateModules(module)
    }
  }

  yield Module
}

function getModuleOptions(Module: Instantiable): ModuleOptions {
  assertInjectable(Module)

  const options = Reflect.getMetadata('di:module', Module)
  if (options) return options as ModuleOptions

  throw new TypeError(`Module ${Module.name} is not a module.`)
}

export function* combineIterables<T>(
  ...iterables: (null | undefined | Iterable<T>)[]
): Iterable<T> {
  for (const iterable of iterables) {
    if (iterable != null) yield* iterable
  }
}
