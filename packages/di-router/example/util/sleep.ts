import { setTimeout } from 'node:timers/promises'

export async function sleep(ms: number, signal?: AbortSignal) {
  if (signal?.aborted) return
  await setTimeout(ms, undefined, { signal }).catch(() => {})
}
