import { FinalHandlerOptions, createFinalHandler } from './final-handler.js'
import { once } from './next.js'
import { Handler, Middleware } from './types.js'

export type AsHandler<M extends Middleware<any, any, any>> =
  M extends Middleware<infer T, infer Req, infer Res>
    ? Handler<T, Req, Res>
    : never

/**
 * Convert a middleware in a function that can be used as both a middleware and
 * an http listener.
 */
export function asHandler<M extends Middleware<any, any, any>>(
  middleware: M,
  options?: FinalHandlerOptions,
) {
  return function (
    this,
    req,
    res,
    next = once(createFinalHandler(req, res, options)),
  ) {
    return middleware.call(this, req, res, next)
  } as AsHandler<M>
}
