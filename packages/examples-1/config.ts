export default function getConfig(env: NodeJS.ProcessEnv) {
  return {
    host: env.HOST || 'localhost',
    port: env.PORT || 3000,
    main_database: {
      uri: env.POSTGRES_URI || '',
    }
  }
}

export type Config = Awaited<ReturnType<typeof getConfig>>
