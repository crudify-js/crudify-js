import {
  Inject,
  Derived,
  Injectable,
  Instantiable,
  Value,
} from '@crudify-js/di'
import { IncomingMessage, ServerResponse } from '@crudify-js/http'
import { HttpMethod, HttpParams, NextFn } from './tokens.js'
import { RouteParams } from './params.js'

export const Req = Inject(IncomingMessage)
export const Res = Inject(ServerResponse)
export const Next = Inject(NextFn)
export const Method = Inject(HttpMethod)
export const Query = Inject(URLSearchParams)
export const Params = Inject(HttpParams)
export const Param = (name: string) =>
  Derived({
    tokens: [HttpParams],
    getter: (params: RouteParams) => {
      if (!Object.hasOwn(params, name) || params[name] == null) {
        throw new Error(`Param ${name} not found`)
      }
      return params[name]
    },
  })

export function Controller<V extends Value = Value>(
  options?: string | { path?: string },
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
  httpPath = '',
) {
  const routerMethods = Reflect.getMetadata('router:methods', prototype) || {}

  routerMethods[propertyKey] ??= {}

  routerMethods[propertyKey][httpPath] = Array.isArray(
    routerMethods[propertyKey][httpPath],
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
      descriptor: PropertyDescriptor,
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
