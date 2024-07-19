import 'reflect-metadata'

import { Value } from '../token.js'
import { stringify } from '../util/stringify.js'

const INJECTABLE_METADATA = 'di:injectable'

export function Injectable<V extends Value = Value>() {
  return function (target: abstract new (...args: any[]) => V) {
    Reflect.defineMetadata(INJECTABLE_METADATA, true, target)
  }
}

export function isInjectable(target: Function) {
  return Reflect.getMetadata(INJECTABLE_METADATA, target) === true
}

export function assertInjectable(target: Function) {
  if (!isInjectable(target)) {
    throw new TypeError(`Class ${stringify(target)} is not injectable.`)
  }
}
