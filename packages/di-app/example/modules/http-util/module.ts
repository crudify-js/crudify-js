import { Inject } from '@crudify-js/di'
import { Module, DynamicModule } from '@crudify-js/di-app'

import { UrlProvider } from './url.provider.js'
import { OriginToken } from './origin.token.js'

@Module({
  provides: [UrlProvider],
  exports: [UrlProvider],
})
export class HttpUtilModule {
  static forRoot(options: { origin: URL | string }): DynamicModule {
    return {
      module: HttpUtilModule,
      exports: [OriginToken],
      provides: [
        {
          provide: OriginToken,
          useValue: new URL(options.origin),
        },
      ],
    }
  }

  constructor(@Inject(OriginToken) readonly origin: URL) {
    console.log('Instantiating:', this.constructor, { origin })
  }
}
