import { Inject } from '@crudify-js/di'
import {
  IncomingMessage as HttpRequest,
  ServerResponse as HttpResponse,
} from '@crudify-js/http'
import { Next } from './tokens.js'
import { getParamTokens } from './utils.js'

export const REQ = Inject(HttpRequest)
export const RES = Inject(HttpResponse)
export const NEXT = Inject(Next)

function addMethodHandler(prototype: any, propertyKey: string, method: string) {
  const methods = Reflect.getMetadata('router:methods', prototype) || {}
  if (methods[method]) throw new Error('Method already defined')
  methods[method] = propertyKey
  Reflect.defineMetadata('router:methods', methods, prototype)
}

function createMethodDecorator(method: string) {
  // TODO: add "path?: string" parameter to allow to define a custom sub-path
  // to the controller's path.
  return () => {
    return (
      prototype: any,
      propertyKey: string,
      descriptor: PropertyDescriptor
    ) => {
      addMethodHandler(prototype, propertyKey, method)
      // Will also be called during instantiation. Calling here to ensure that the
      // tokens are available when the handler is created. This will allow to
      // throw and error when the class is created rather than when the http
      // request is received.
      getParamTokens(prototype, propertyKey)
    }
  }
}

export const Get = createMethodDecorator('GET')
export const Post = createMethodDecorator('POST')
export const Delete = createMethodDecorator('DELETE')
export const Put = createMethodDecorator('PUT')

export function Controller(path: string) {
  return (target: any) => {
    Reflect.defineMetadata('router:path', path, target)
  }
}
