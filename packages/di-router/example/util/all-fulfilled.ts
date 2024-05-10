export async function allFulfilled<T extends readonly unknown[] | []>(
  promises: T,
  message?: string
): Promise<{ -readonly [P in keyof T]: Awaited<T[P]> }>

export async function allFulfilled<T>(
  promises: Iterable<T | PromiseLike<T>>,
  message?: string
): Promise<Awaited<T>[]>

export async function allFulfilled(
  promises: Iterable<unknown>,
  message?: string
): Promise<unknown[]> {
  const results = await Promise.allSettled(promises)
  if (results.every(isFulfilled)) return results.map(extractValue)
  const errors = results.filter(isRejected).map(extractReason)
  throw new AggregateError(errors, message)
}

function isFulfilled<T>(
  result: PromiseSettledResult<T>
): result is PromiseFulfilledResult<T> {
  return result.status === 'fulfilled'
}

function isRejected(
  result: PromiseSettledResult<unknown>
): result is PromiseRejectedResult {
  return result.status === 'rejected'
}

function extractReason(result: PromiseRejectedResult): unknown {
  return result.reason
}

function extractValue<T>(result: PromiseFulfilledResult<T>): T {
  return result.value
}
