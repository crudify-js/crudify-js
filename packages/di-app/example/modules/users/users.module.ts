import { Module } from '@crudify-js/di-app'
import { UsersContoller } from './users.controller.js'
import { UsersService } from './users.service.js'

@Module({
  controllers: [UsersContoller],
  provides: [UsersService],
  exports: [UsersService],
})
export class UserModule {}
