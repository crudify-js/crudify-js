import { Value } from '../token.js'

export type Instantiable<V extends Value = Value> = new (...args: any[]) => V
