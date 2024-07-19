import { Injectable } from '@crudify-js/di'

@Injectable()
export class UsersService {
  foo = 'bar'
  constructor() {
    console.error('Instatiating UsersService')
  }
  async getUsers() {
    return [
      {
        id: 1,
        name: 'John',
      },
    ]
  }
}
