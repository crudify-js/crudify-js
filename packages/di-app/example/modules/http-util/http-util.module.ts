import { Module } from '@crudify-js/di-app'
import { UrlProvider } from './url.provider.js'

@Module({
  provides: [UrlProvider],
  exports: [UrlProvider],
})
export class HttpUtilModule {
  constructor(readonly url: URL) {
    console.log('Instantiating:', this.constructor)
  }
}
