import { Value } from '../token.js'
import { stringify } from '../util/stringify.js'

export function Injectable<V extends Value = Value>() {
  return function (target: abstract new (...args: any[]) => V) {
    Reflect.defineMetadata('di:injectable', true, target)
  }
}

export function isInjectable(target: Function) {
  return Reflect.getMetadata('di:injectable', target) === true
}

export function assertInjectable(target: Function) {
  if (!isInjectable(target)) {
    throw new TypeError(`Class ${stringify(target)} is not injectable.`)
  }
}
