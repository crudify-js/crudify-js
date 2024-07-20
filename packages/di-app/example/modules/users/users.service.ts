import { Injectable } from '@crudify-js/di'

@Injectable()
export class UsersService {
  foo = 'bar'
  constructor() {
    console.error(`Instantiating:`, this.constructor)
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
