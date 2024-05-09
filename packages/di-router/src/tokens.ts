import { abstractToken } from '@crudify-js/di'
import { IncomingMessage, NextFunction, ServerResponse } from '@crudify-js/http'

export abstract class NextFn extends abstractToken<NextFunction>() {}
export abstract class HttpRequest extends abstractToken<IncomingMessage>() {}
export abstract class HttpResponse extends abstractToken<ServerResponse>() {}

