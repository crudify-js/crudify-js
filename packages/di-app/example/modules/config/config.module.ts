import { DynamicModule, HttpModule, Module } from '@crudify-js/di-app'
import { ConfigService } from './config.service.js'

@Module({})
export class ConfigModule {
  static forRoot(env = process.env): DynamicModule {
    return {
      module: ConfigModule,
      imports: [HttpModule.forRoot(env)],
      provides: [ConfigService.fromEnv(env)],
    }
  }
}
