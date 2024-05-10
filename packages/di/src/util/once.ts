export function once<F extends (this: unknown, ...args: unknown[]) => unknown>(
  fn: F
): F {
  let state:
    | PromiseSettledResult<ReturnType<F>>
    | { status: 'pending'; fn: F } = { status: 'pending', fn }

  return function (
    this: ThisParameterType<F>,
    ...args: Parameters<F>
  ): ReturnType<F> {
    if (state.status === 'fulfilled') return state.value
    if (state.status === 'rejected') throw state.reason

    const { fn } = state
    state = {
      status: 'rejected',
      reason: new Error('Invalid recursive call in once() wrapped function'),
    }
    try {
      const value = fn.call(this, ...args) as ReturnType<F>
      state = { status: 'fulfilled', value }
      return value
    } catch (reason) {
      state = { status: 'rejected', reason }
      throw reason
    }
  } as F
}
