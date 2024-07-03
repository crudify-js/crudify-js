import { Derived } from '@crudify-js/di'
import { Config } from '../providers/config.js'

// Allows using `@Origin origin?: string | URL` instead of
// `@Inject(Config) { http: { origin } }: Config`.
export const Origin = Derived({
  inject: [Config],
  useFactory: (config: Config) => config.http.origin,
})
