import { Provider } from '@crudify-js/di'
import { IncomingMessage } from '@crudify-js/di-router'

export const UrlProvider: Provider<URL> = {
  provide: URL,
  inject: [IncomingMessage],
  useFactory: (req: IncomingMessage) => {
    return new URL(req.url || '/', 'http://localhost:4001')
  },
}
