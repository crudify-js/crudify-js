import { allFulfilled } from './all-fulfilled.js'

export async function subTasks<T>(
  signal: AbortSignal,
  fns: Iterable<(signal: AbortSignal) => T | PromiseLike<T>>,
) {
  signal.throwIfAborted()

  const controller = new AbortController()
  const abort = () => controller.abort()
  signal.addEventListener('abort', abort, { signal: controller.signal })
  try {
    const promises = Array.from(fns, async (fn) => {
      try {
        return await fn(controller.signal)
      } catch (err) {
        // First error will abort all other tasks
        controller.abort()
        throw err
      }
    })

    return await allFulfilled(promises)
  } finally {
    // make sure to clean up the signal listener
    controller.abort()
  }
}
