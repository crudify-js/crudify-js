import { Token } from '@crudify-js/di'
import { NextFunction } from '@crudify-js/http'
import { RouteParams } from './params.js'

export const NextFn: Token<NextFunction> = Symbol('NextFunction')
export const HttpMethod: Token<string> = Symbol('HttpMethod')
export const HttpParams: Token<RouteParams> = Symbol('HttpParams')
