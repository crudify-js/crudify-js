import { createServer } from 'node:http'
import 'reflect-metadata'

import {
  getProviderToken,
  Injectable,
  Injector,
  Instantiable,
  isInjectable,
  Provider,
  Token,
  Value,
  valueProvider,
} from '@crudify-js/di'
import { Router } from '@crudify-js/di-router'
import { asHandler, IncomingMessage, startServer } from '@crudify-js/http'
import { run } from '@crudify-js/process'

export type ModuleOptions = {
  controllers?: Iterable<Instantiable>
  provides?: Iterable<Provider>
  exports?: Iterable<Token | Provider>
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

export async function bootstrap(Module: Instantiable) {
  await run(async (signal) => {
    await using app = new AppContext(Module)
    if (!signal.aborted) await app.listen({ signal })
  })
}

export class AppContext
  extends AsyncDisposableStack
  implements AsyncDisposable
{
  readonly #injector: Injector
  readonly #router: Router

  readonly #abortController = new AbortController()
  readonly #pending: Set<Promise<void>> = new Set()

  constructor(def: Instantiable | DynamicModule) {
    super()

    const { providers, controllers, imported } = buildModule(def)

    for (const Module of defaultModules) {
      if (!imported.has(Module)) {
        for (const provider of getModuleClassOptions(Module).provides || []) {
          const token = getProviderToken(provider)
          if (!providers.has(token)) {
            providers.set(token, provider)
          }
        }
      }
    }

    const injector = new Injector(providers.values())
    this.#injector = this.use(injector)

    const router = new Router({ controllers, injector })
    this.#router = this.use(router)

    this.defer(async () => {
      this.#abortController.abort()
      await Promise.all(this.#pending)
    })
  }

  get<V extends Value>(token: Token<V>): V {
    return this.#injector.get(token)
  }

  async listen(options?: { signal?: AbortSignal }) {
    const { port } = this.get(HttpConfig)

    using ac = combineSignals([options?.signal, this.#abortController.signal])

    const handler = asHandler(this.#router.middleware)
    const server = createServer(handler)

    const promise = startServer(ac.signal, server, port).finally(() => {
      this.#pending.delete(promise)
    })

    this.#pending.add(promise)

    await promise
  }
}

function buildModule(def: Instantiable | DynamicModule): {
  Module: Instantiable
  imported: Set<Instantiable>
  controllers: Iterable<Instantiable>
  providers: Map<Token, Provider>
} {
  // Depth first enumeration of modules
  const {
    Module,
    options: { provides, controllers, imports },
  } = parseModule(def)

  const controllersArray: Instantiable[] = []
  const providersMap = new Map<Token, Provider>()
  const importedModules = new Set<Instantiable>()

  if (provides) {
    for (const provider of provides) {
      const token = getProviderToken(provider)
      if (providersMap.has(token)) {
        throw new Error(`Duplicate provider ${String(token)} in ${Module.name}`)
      }
      providersMap.set(token, provider)
    }
  }

  if (controllers) {
    controllersArray.push(...controllers)
  }

  if (imports) {
    for (const module of imports) {
      const { Module, providers, controllers } = buildModule(module)

      if (importedModules.has(Module)) {
        throw new Error(`Module ${Module.name} is imported more than once`)
      }
      importedModules.add(Module)

      controllersArray.push(...controllers)

      for (const provider of providers.values()) {
        const token = getProviderToken(provider)
        if (!providersMap.has(token)) {
          providersMap.set(token, provider)
        }
      }
    }
  }

  return {
    Module,
    imported: importedModules,
    controllers: controllersArray,
    providers: providersMap,
  }
}

type ParsedModule = { Module: Instantiable; options: ModuleOptions }
function parseModule(def: Instantiable | DynamicModule): ParsedModule {
  if (typeof def === 'function') {
    return { Module: def, options: getModuleClassOptions(def) }
  } else {
    return { Module: def.module, options: getDynamicModuleOptions(def) }
  }
}

function getModuleClassOptions(def: Instantiable): ModuleOptions {
  assertModule(def)
  const options: ModuleOptions = Reflect.getMetadata('di:module', def)
  if ('module' in def) throw new Error('Module cannot have a "module" property')
  return options
}

function getDynamicModuleOptions(def: DynamicModule): ModuleOptions {
  assertModule(def.module)
  return def
}

export function isModule(value: Function): value is Instantiable {
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

export function combineSignals(
  signals: Iterable<AbortSignal | undefined | null>,
) {
  const controller = new DisposableAbortController()

  const onAbort = function (this: AbortSignal, _event: Event) {
    const reason = new Error('This operation was aborted', {
      cause: this.reason,
    })

    controller.abort(reason)
  }

  for (const sig of signals) {
    if (!sig) continue

    if (sig.aborted) {
      // Remove "abort" listener that was added to sig in previous iterations
      controller.abort()

      throw new Error('One of the signals is already aborted', {
        cause: sig.reason,
      })
    }

    sig.addEventListener('abort', onAbort, { signal: controller.signal })
  }

  return controller
}

class DisposableAbortController extends AbortController implements Disposable {
  get disposed() {
    return this.signal.aborted
  }

  [Symbol.dispose]() {
    this.abort(new Error('AbortController was disposed'))
  }
}

function parseInteger(value: unknown, fallback: number): number {
  const parsed = typeof value === 'string' ? Number(value) : undefined
  return parsed == null || Number.isNaN(parsed) ? fallback : parsed
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (value === 'true' || value === '1' || value === true) return true
  if (value === 'false' || value === '0' || value === false) return false
  return fallback
}

export type HttpConfigValue = {
  trustProxy: boolean
  origin: URL
  port: number
}

export abstract class HttpConfig extends valueProvider<HttpConfigValue>() {
  static fromEnv(env = process.env) {
    const port = parseInteger(env['PORT'], 4000)
    return this.provideValue({
      trustProxy: parseBoolean(env['TRUST_PROXY'], false),
      origin: new URL(env['ORIGIN'] ?? `http://localhost:${port}`),
      port,
    })
  }

  // shorthand getters

  get port() {
    return this.value.port
  }

  get trustProxy() {
    return this.value.trustProxy
  }
  get origin() {
    return this.value.origin
  }
}

export const UrlProvider: Provider<URL> = {
  provide: URL,
  inject: [IncomingMessage, HttpConfig],
  useFactory: (req: IncomingMessage, config: HttpConfig) => {
    // @TODO Use trustProxy, etc. here
    return new URL(req.url || '/', config.origin)
  },
}

@Module({
  controllers: [],
  provides: [HttpConfig.fromEnv(), UrlProvider],
})
export class HttpModule {
  static forRoot(env = process.env): DynamicModule {
    return {
      module: HttpModule,
      provides: [HttpConfig.fromEnv(env), UrlProvider],
    }
  }
}

const defaultModules: Instantiable[] = [HttpModule]
