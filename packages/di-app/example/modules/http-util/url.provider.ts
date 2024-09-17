import { Provider } from '@crudify-js/di'
import { IncomingMessage } from '@crudify-js/di-router'

import { OriginToken } from './origin.token.js'

export const UrlProvider: Provider<URL> = {
  provide: URL,
  inject: [IncomingMessage, OriginToken],
  useFactory: (req: IncomingMessage, origin: URL) => {
    return new URL(req.url || '/', origin)
  },
}
