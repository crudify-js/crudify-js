// @ts-ignore
Symbol.dispose ??= Symbol('Symbol.dispose')
// @ts-ignore
Symbol.asyncDispose ??= Symbol('Symbol.asyncDispose')

export function isDisposable(value: unknown): value is Disposable {
  return (
    typeof value === 'object' &&
    value !== null &&
    Symbol.dispose in value &&
    typeof value[Symbol.dispose] === 'function'
  )
}

export function isAsyncDisposable(value: unknown): value is AsyncDisposable {
  return (
    typeof value === 'object' &&
    value !== null &&
    Symbol.asyncDispose in value &&
    typeof value[Symbol.asyncDispose] === 'function'
  )
}

// TODO: Replace with standard disposable stack once it's available
export class AsyncDisposableStack implements AsyncDisposable {
  #stack?: unknown[] = []

  get disposed() {
    return this.#stack === undefined
  }

  use(value: unknown) {
    if (!this.#stack) {
      throw new TypeError(`A disposed stack can not use anything new`)
    }

    if (isAsyncDisposable(value) || isDisposable(value)) {
      this.#stack.push(value)
    }
  }

  async [Symbol.asyncDispose]() {
    // Check if already disposed
    if (!this.#stack) return

    // Mark as disposed
    const stack = this.#stack
    this.#stack = undefined

    const errors: unknown[] = []

    // Dispose in reverse order
    for (let i = stack.length - 1; i >= 0; i--) {
      const item = stack[i]
      try {
        if (isAsyncDisposable(item)) {
          await item[Symbol.asyncDispose]()
        } else if (isDisposable(item)) {
          item[Symbol.dispose]()
        }
      } catch (error) {
        errors.push(error)
      }
    }

    if (errors.length) {
      throw new AggregateError(
        errors,
        `An error occurred while disposing the stack.`
      )
    }
  }
}
