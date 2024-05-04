export type Value = object

export type Token<V extends Value = Value> = abstract new (...args: any[]) => V
export type InjectableToken<V extends Value = Value> = new (...args: any[]) => V
export type Factory<V extends Value = Value> = (injector: {
  get<V extends Value>(token: Token<V>): V
}) => V
export type Injectable<V extends Value = Value> = readonly [
  token: Token<V>,
  factory: Factory<V>
]
