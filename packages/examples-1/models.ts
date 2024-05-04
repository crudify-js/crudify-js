import { default as UsersModel } from "./models/users.ts"

export const models = Object.freeze({
  users: UsersModel,
  files: new GoogleCloudStorageModel({
    // connection: 'googleCloudStorage',
    folder: 'my-folder',
    bucket: 'my-bucket',
  }),
  ...createStripeModels({
    prefix: 'stripe_',
  }),
})

function createStripeModels({ prefix = ''}) {
  return {
    payment: new HttpEndpointModel({
      //
    })
  }
}


@Module({
  imports: [
    //
    StripeModule.register({ prefix: 'stripe_' }),
  ],
  providers: [
    //
    UsersModel,
  ]
})
export class AppModels {}