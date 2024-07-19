import { ChildProcess } from 'node:child_process'

export type Runable<T> = (stopSignal: AbortSignal) => T | PromiseLike<T>

export async function run<T>(
  main: Runable<T>,
  onabort = (reason: unknown): void => {
    console.info('Shutdown initiated...')
    setupTerminator()
  },
): Promise<T> {
  const stopController = new AbortController()

  const abort = (reason: unknown) => {
    stopController.abort(reason)

    process.removeListener('SIGINT', abort)
    process.removeListener('SIGTERM', abort)

    // Because we currently are "inside" the processing of a signal, we need to
    // defer the actual handling of the signal to the next tick to avoid any
    // signal listener added by "onabort" to be triggered by the current signal.

    // We still need to make sure that there are listeners for SIGINT and
    // SIGTERM to avoid the process from exiting immediately after the signal is
    // handled.

    // The 100ms delay is totally arbitrary. During my tests, a value of at
    // least 6ms was required.
    const noop = () => {}

    process.addListener('SIGINT', noop)
    process.addListener('SIGTERM', noop)

    setTimeout(() => {
      onabort(reason)

      process.removeListener('SIGINT', noop)
      process.removeListener('SIGTERM', noop)
    }, 100).unref()
  }
  process.addListener('SIGINT', abort)
  process.addListener('SIGTERM', abort)

  try {
    return await main(stopController.signal)
  } catch (err) {
    abort(err) // main() threw an error. Make sure that the signal is aborted.
    throw err
  } finally {
    process.removeListener('SIGINT', abort)
    process.removeListener('SIGTERM', abort)
  }
}

type TerminatorOptions = {
  signals?: NodeJS.Signals[]
  killTimeout?: number
}

/**
 * Setup a timer to terminate the process in a short while and signal handlers
 * to terminate the process instantaneously.
 *
 * @returns Cancel function
 */
export function setupTerminator({
  signals = ['SIGINT', 'SIGTERM'],
  killTimeout = 30e3,
}: TerminatorOptions = {}) {
  const seconds = (killTimeout / 1e3).toFixed(1)
  console.info(
    `Send ${signals.join(' or ')} to terminate now (timeout ${seconds}s).`,
  )

  const timer = setTimeout(exitNow, killTimeout, 'timeout').unref()
  for (const signal of signals) process.addListener(signal, exitNow)

  return () => {
    clearTimeout(timer)
    for (const signal of signals) process.removeListener(signal, exitNow)
  }
}

function exitNow(cause: string) {
  console.info(`Terminating... (${cause})`)
  process.exit(0)
}

export async function killChildProcess(
  child: ChildProcess,
  signal: NodeJS.Signals = 'SIGTERM',
  timeout = 10e3,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!child.kill(signal)) return resolve()

    let timer: NodeJS.Timeout | null = null
    const cleanup = () => {
      if (timer) clearTimeout(timer)
      child.removeListener('error', rejectAndCleanup)
      child.removeListener('close', resolveAndCleanup)
      child.removeListener('disconnect', resolveAndCleanup)
      child.removeListener('exit', resolveAndCleanup)
    }

    const rejectAndCleanup = (err: unknown) => {
      reject(err)
      cleanup()
    }

    const resolveAndCleanup = () => {
      resolve()
      cleanup()
    }

    child.addListener('error', rejectAndCleanup)
    child.addListener('close', resolveAndCleanup)
    child.addListener('exit', resolveAndCleanup)

    // If the process does not exit within the timeout, send SIGTERM
    timer = setTimeout(
      (err: Error) => {
        console.warn(`Timeout reached, sending SIGTERM to ${child.pid}`)
        if (!child.kill('SIGTERM')) return resolveAndCleanup()

        // If the process does not exit within 100ms, reject
        timer = setTimeout(rejectAndCleanup, 100, err)
      },
      timeout - 100,
      // Instantiate the error here to capture the stack trace
      new Error(`Failed to kill process ${child.pid} within ${timeout}ms`),
    )
  })
}
