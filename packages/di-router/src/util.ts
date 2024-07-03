export function* combineIterables<T>(
  ...iterables: (null | undefined | false | Iterable<T>)[]
): Iterable<T> {
  for (const iterable of iterables) {
    if (iterable == null) continue
    if (iterable === false) continue

    yield* iterable
  }
}
