import { Module } from '@crudify-js/di-app'
import { HttpUtilModule } from '../http-util/module.js'
import { UsersContoller } from './users.controller.js'
import { UsersService } from './users.service.js'

@Module({
  controllers: [UsersContoller],
  provides: [UsersService],
  exports: [UsersService],
  imports: [HttpUtilModule],
})
export class UserModule {}
