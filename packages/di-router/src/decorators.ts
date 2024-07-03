import { Derived, Injectable, Instantiable, Value } from '@crudify-js/di'
import {
  HttpMethod,
  HttpParams,
  HttpQuery,
  HttpRequest,
  HttpResponse,
  HttpUrl,
  NextFn,
} from './tokens.js'

export const Req = Derived({
  inject: [HttpRequest],
  useFactory: (i: HttpRequest) => i.value,
})
export const Res = Derived({
  inject: [HttpResponse],
  useFactory: (i: HttpResponse) => i.value,
})
export const Next = Derived({
  inject: [NextFn],
  useFactory:
    ({ value }: NextFn) =>
    // We do not simply return value to ensure that `this` is not propagated
    (...args) =>
      value(...args),
})
export const Method = Derived({
  inject: [HttpMethod],
  useFactory: (i: HttpMethod) => i.value,
})
export const Query = Derived({
  inject: [HttpQuery],
  useFactory: (i: HttpQuery) => i.value,
})
export const Url = Derived({
  inject: [HttpUrl],
  useFactory: (i: HttpUrl) => i.value,
})
export const Params = Derived({
  inject: [HttpParams],
  useFactory: (i: HttpParams) => i.value,
})
export const Param = (name: string) =>
  Derived({
    inject: [HttpParams],
    useFactory: ({ value }: HttpParams) => {
      if (!Object.hasOwn(value, name)) {
        throw new Error(`Param ${name} not found`)
      }
      return value[name]
    },
  })

export function Controller<V extends Value = Value>(
  options?: string | { path?: string }
) {
  const injectableTransformer = Injectable()

  const opts = typeof options === 'string' ? { path: options } : options ?? {}

  return (target: Instantiable<V>) => {
    Reflect.defineMetadata('router:controller', opts, target)
    return injectableTransformer(target)
  }
}

function addMethodHandler(
  prototype: any,
  propertyKey: string,
  httpVerbs: string[],
  httpPath = ''
) {
  const routerMethods = Reflect.getMetadata('router:methods', prototype) || {}

  routerMethods[propertyKey] ??= {}

  routerMethods[propertyKey][httpPath] = Array.isArray(
    routerMethods[propertyKey][httpPath]
  )
    ? [...routerMethods[propertyKey][httpPath], ...httpVerbs]
    : httpVerbs

  Reflect.defineMetadata('router:methods', routerMethods, prototype)
}

function createMethodDecorator(...httpVerbs: string[]) {
  return (httpPath?: string) => {
    return (
      prototype: Object,
      propertyKey: string,
      descriptor: PropertyDescriptor
    ) => {
      addMethodHandler(prototype, propertyKey, httpVerbs, httpPath)
    }
  }
}

export const Delete = createMethodDecorator('DELETE')
export const Get = createMethodDecorator('GET')
export const Head = createMethodDecorator('HEAD')
export const Options = createMethodDecorator('OPTIONS')
export const Post = createMethodDecorator('POST')
export const Put = createMethodDecorator('PUT')
