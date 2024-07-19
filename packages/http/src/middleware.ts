import { once } from './next.js'
import { Middleware } from './types.js'

export function combineMiddlewares<M extends Middleware<any, any, any>>(
  middlewares: Iterable<null | undefined | M>,
  options?: { skipKeyword?: string },
): M

/**
 * Combine express/connect like middlewares (that can be async) into a single
 * middleware.
 */
export function combineMiddlewares(
  middlewares: Iterable<null | undefined | Middleware<unknown>>,
  { skipKeyword }: { skipKeyword?: string } = {},
): Middleware<unknown> {
  const middlewaresArray = Array.from(middlewares).filter(
    (x): x is NonNullable<typeof x> => x != null,
  )

  // Optimization: if there are no middlewares, return a noop middleware.
  if (middlewaresArray.length === 0) return (req, res, next) => void next()

  return function (req, res, next) {
    if (typeof next !== 'function') {
      throw new TypeError('next is required')
    }

    let i = 0
    const nextMiddleware = (err?: unknown) => {
      if (err) {
        if (skipKeyword && err === skipKeyword) next()
        else next(err)
      } else if (i >= middlewaresArray.length) {
        next()
      } else {
        const currentMiddleware = middlewaresArray[i++]
        if (!currentMiddleware) {
          throw new TypeError('Middleware is null or undefined')
        }
        const currentNext = once(nextMiddleware)
        try {
          const result = currentMiddleware.call(this, req, res, currentNext)
          Promise.resolve(result).catch(currentNext)
        } catch (err) {
          currentNext(err)
        }
      }
    }
    nextMiddleware()
  }
}
