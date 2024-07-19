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
  controllers?: Instantiable[]
  provides?: Provider[]
  exports?: (Provider | Token)[]
  // exports?: Token[]
  imports?: Instantiable[]
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
  readonly #injector: Injector
  readonly injector: Injector
  readonly router?: Router

  constructor(
    readonly Module: Instantiable,
    readonly imports: ModuleContext[],
  ) {
    const options = getModuleOptions(Module)

    this.#injector = new Injector(
      combineIterables(
        [{ provide: Module, useClass: Module }],
        options.provides,
        proxyProviders(imports),
      ),
    )

    this.injector = new Injector(
      options.exports?.map((value) => {
        const token =
          value != null && typeof value === 'object' && 'provide' in value
            ? value.provide
            : value
        return proxyToken(token, this.#injector)
      }),
    )

    this.router = options.controllers
      ? new Router({
          controllers: options.controllers,
          injector: this.#injector,
        })
      : undefined
  }

  get handler(): Handler {
    return asHandler(
      combineMiddlewares([
        this.router?.handler,
        ...this.imports.map((p) => p.handler),
      ]),
    )
  }

  async [Symbol.asyncDispose]() {
    try {
      await this.router?.[Symbol.asyncDispose]()
      await this.injector[Symbol.asyncDispose]()
    } finally {
      await this.#injector[Symbol.asyncDispose]()
    }
  }
}

class AppContext {
  readonly #moduleContextInjector: Injector
  readonly #moduleContext: ModuleContext

  constructor(Module: Instantiable) {
    const visited = new Map<Instantiable, Token<ModuleContext>>()

    for (const mod of enumerateModules(Module)) {
      if (!visited.has(mod)) {
        visited.set(mod, Symbol(mod.name))
      }
    }

    this.#moduleContextInjector = new Injector(
      Array.from(visited, ([Mod, token]) => ({
        provide: token,
        inject: getModuleOptions(Mod).imports?.map(
          visited.get,
          visited,
        ) as Token[],
        autoDispose: true,
        useFactory: (...imports: ModuleContext[]) =>
          new ModuleContext(Mod, imports),
      })),
    )

    this.#moduleContext = this.#moduleContextInjector.get(visited.get(Module)!)
  }

  async listen(port: number, signal?: AbortSignal) {
    const server = createServer(this.#moduleContext.handler)
    if (signal) await startServer(signal, server, port)
    else await run(async (signal) => startServer(signal, server, port))
  }

  async [Symbol.asyncDispose]() {
    await this.#moduleContextInjector[Symbol.asyncDispose]()
  }
}

function* proxyProviders(
  contexts: Iterable<ModuleContext>,
): Generator<Provider> {
  for (const { injector } of contexts) {
    for (const token of injector) {
      yield proxyToken(token, injector)
    }
  }
}

function proxyToken<V extends Value>(
  token: Token<V>,
  injector: Injector,
): Provider<V> {
  return {
    provide: token,
    autoDispose: false,
    useFactory: () => injector.get(token),
  }
}

function* enumerateModules(Module: Instantiable): Generator<Instantiable> {
  yield Module

  const { imports } = getModuleOptions(Module)
  if (imports) {
    for (const module of imports) {
      yield* enumerateModules(module)
    }
  }
}

function getModuleOptions(Module: Instantiable): ModuleOptions {
  assertInjectable(Module)

  const options = Reflect.getMetadata('di:module', Module) as
    | ModuleOptions
    | undefined
  if (!options) throw new TypeError(`Module ${Module.name} is not a module.`)

  return options
}

export function* combineIterables<T>(
  ...iterables: (null | undefined | false | Iterable<T>)[]
): Iterable<T> {
  for (const iterable of iterables) {
    if (iterable == null) continue
    if (iterable === false) continue

    yield* iterable
  }
}
