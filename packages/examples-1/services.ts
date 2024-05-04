import {Agent as HttpAgent} from 'http'
import {Agent as HttpsAgent} from 'https'

import { Config } from './config'

export default async function createServices(config: Config) {
  return {
    httpAgent: new HttpAgent(),
    httpsAgent: new HttpsAgent({ keepAlive: true }),
  }
}

export type Services = Awaited<ReturnType<typeof createServices>>
