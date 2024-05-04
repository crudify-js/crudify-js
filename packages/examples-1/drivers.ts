import { Config } from './config'
import { Context } from './context'

export function createDrivers(config: Config) {

  const database = new DbConnection(config.main_database)

  return (context: Context) =>({
    database,

    // Lazy instantiation
    get googleCloudStorage() {
      return new GoogleCloudStorageConnection({
        defaultBucket: 'my-files',
      })
    },
  })
}
