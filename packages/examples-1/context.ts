import type {Request} from 'hapi'

import { Config } from './config'
import { Services } from './services'

export async function createContext(config: Config, services: Services, request?: Request) {
  return {
    config,
    services,
    request,
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>
