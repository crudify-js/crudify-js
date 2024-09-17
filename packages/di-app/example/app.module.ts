import { Module } from '@crudify-js/di-app'
import { Home } from './controllers/home.js'
import { UserModule } from './modules/users/users.module.js'
import { UsersService } from './modules/users/users.service.js'
import { HttpUtilModule } from './modules/http-util/module.js'

@Module({
  imports: [
    UserModule,
    HttpUtilModule.forRoot({ origin: 'https://example.com' }),
  ],
  exports: [UserModule],
  controllers: [Home],
})
export class AppModule {
  constructor(readonly userService: UsersService) {
    console.log('Instantiating:', this.constructor, { userService })
  }
}
