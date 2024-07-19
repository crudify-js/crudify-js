import { Provider } from '@crudify-js/di'
import { IncomingMessage } from '@crudify-js/http'

export const URLSearchParamsProvider: Provider<URLSearchParams> = {
  provide: URLSearchParams,
  inject: [IncomingMessage],
  useFactory: (req: IncomingMessage) =>
    new URLSearchParams(req.url?.split('?')[1] ?? ''),
}
