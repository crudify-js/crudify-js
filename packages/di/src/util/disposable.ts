import { isObject } from './is-object.js'

const kDispose: typeof Symbol.dispose = Symbol.dispose
const kAsyncDispose: typeof Symbol.asyncDispose = Symbol.asyncDispose

if (!kDispose || !kAsyncDispose) {
  throw new Error(
    `Disposable symbols are not available. Please use a polyfill.`,
  )
}

export function isDisposable(value: unknown): value is Disposable {
  return (
    isObject(value) &&
    kDispose in value &&
    typeof value[kDispose] === 'function'
  )
}

export function isAsyncDisposable(value: unknown): value is AsyncDisposable {
  return (
    isObject(value) &&
    kAsyncDispose in value &&
    typeof value[kAsyncDispose] === 'function'
  )
}
