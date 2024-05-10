import { Value } from '../token.js'
import { stringify } from '../util/stringify.js'

export function Injectable<V extends Value = Value>() {
  return function (target: abstract new (...args: any[]) => V) {
    Reflect.defineMetadata('di:injectable', true, target)
  }
}

export function assertInjectable(target: Function) {
  if (Reflect.getMetadata('di:injectable', target) !== true) {
    throw new TypeError(`Class ${stringify(target)} is not injectable.`)
  }
}
