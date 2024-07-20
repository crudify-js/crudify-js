import { run } from '@crudify-js/process'
import { AppContext } from '@crudify-js/di-app'
import { AppModule } from './app.module.js'

run(async (signal) => {
  await using app = new AppContext(AppModule)

  console.error('AppModule:', app.get(AppModule))

  await app.listen(4001, signal)
})

// import { bootstrap } from '@crudify-js/di-app'
// import { AppModule } from './app.module.js'
// bootstrap(AppModule)
