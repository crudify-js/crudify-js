import { Token } from '@crudify-js/di'
import { Module, DynamicModule } from '@crudify-js/di-app'

export const FooToken: Token<string> = Symbol('FooToken')

@Module({
  exports: [FooToken],
})
export class FooModule {
  static forFeature(foo: string): DynamicModule {
    return {
      module: FooModule,
      exports: [FooToken],
      provides: [
        {
          provide: FooToken,
          useValue: foo,
        },
      ],
    }
  }

  static forRoot(foo: string): DynamicModule {
    return {
      module: FooModule,
      exports: [],
      provides: [
        {
          provide: FooToken,
          useValue: foo,
        },
      ],
    }
  }
}
