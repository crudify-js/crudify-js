import { createServer } from 'node:http'

import { asHandler, startServer } from '@crudify-js/http'
import {
  assertInjectable,
  Injectable,
  Injector,
  Instantiable,
  Provider,
  Token,
} from '@crudify-js/di'
import { run } from '@crudify-js/process'
import { Router } from '@crudify-js/di-router'
import { combineMiddlewares, Handler } from '@crudify-js/http'

import 'reflect-metadata'

export type ModuleOptions = {
  controllers?: Instantiable[]
  provides?: Provider[]
  // exports?: (Provider | Token)[]
  exports?: Token[]
  imports?: Instantiable[]
}

const makeInjectable = Injectable()

export function Module(options: ModuleOptions = {}) {
  return function (target: Instantiable) {
    Reflect.defineMetadata('di:module', options, target)
    makeInjectable(target)
  }
}

export async function bootstrap(Module: Instantiable, port: number = 4001) {
  await using app = buildContext(Module)
  console.debug('app', app)

  const instance = app.module
  console.debug('instance', instance)

  await run(async (signal) => {
    const server = createServer(app.handler)

    await startServer(signal, server, port)
  })
}

class Context {
  readonly #injector: Injector
  readonly injector: Injector
  readonly router: Router

  constructor(
    readonly Module: Instantiable,
    readonly parents: Context[],
  ) {
    const options = getModuleOptions(Module)

    this.#injector = new Injector(
      combineIterables(
        [{ provide: Module, useClass: Module }],
        options.provides,
        // Expose every providers from the dependencies
        parents.flatMap(({ injector }) =>
          Array.from(injector, (token) => ({
            provide: token,
            useValue: injector.get(token),
          })),
        ),
      ),
    )

    this.injector = new Injector(
      options.exports?.map((token) => ({
        provide: token,
        useFactory: () => this.#injector.get(token),
      })),
    )

    this.router = new Router({
      controllers: options.controllers ?? [],
      injector: this.#injector,
      // TODO: how to pass http oritgin option ?
    })
  }

  get module() {
    return this.#injector.get(this.Module)
  }

  get handler(): Handler {
    return asHandler(
      combineMiddlewares([
        this.router.middleware,
        combineMiddlewares(this.parents.map((p) => p.handler)),
      ]),
    )
  }

  async [Symbol.asyncDispose]() {
    try {
      await this.router[Symbol.asyncDispose]()
      await this.injector[Symbol.asyncDispose]()
    } finally {
      await this.#injector[Symbol.asyncDispose]()
    }
  }
}

function buildContext(Module: Instantiable) {
  const visited = new Map<Instantiable, Token<Context>>()

  for (const mod of enumerateModules(Module)) {
    if (!visited.has(mod)) {
      visited.set(mod, Symbol(mod.name))
    }
  }

  // TODO: destroy this injector
  const injector = new Injector(
    Array.from(visited, ([Mod, token]) => {
      return {
        provide: token,
        inject: getModuleOptions(Mod).imports?.map((M) => visited.get(M)!),
        useFactory: (...parents: Context[]) => {
          return new Context(Mod, parents)
        },
      }
    }),
  )

  return injector.get(visited.get(Module)!)
}

function* enumerateModules(Module: Instantiable): Generator<Instantiable> {
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
