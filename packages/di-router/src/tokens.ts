import { abstractToken } from '@crudify-js/di'
import { NextFunction } from '@crudify-js/http'

export abstract class NextFn extends abstractToken<NextFunction>() {}
