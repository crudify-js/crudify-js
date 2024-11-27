import { Module } from '@crudify-js/di-app'
import { Home } from './controllers/home.js'
import { ConfigModule } from './modules/config/config.module.js'
import { UserModule } from './modules/users/users.module.js'
import { UsersService } from './modules/users/users.service.js'

@Module({
  imports: [UserModule, ConfigModule.forRoot()],
  exports: [UserModule],
  provides: [AppModule],
  controllers: [Home],
})
export class AppModule {
  constructor(readonly userService: UsersService) {
    console.log('Instantiating:', this.constructor, { userService })
  }
}
