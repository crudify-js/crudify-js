import { NextFunction } from './types.js'

export function once<T extends NextFunction>(next: T): T {
  let nextNullable: T | null = next
  return function (err) {
    if (!nextNullable) throw new Error('next() called multiple times')
    const next = nextNullable
    nextNullable = null
    return next(err)
  } as T
}
