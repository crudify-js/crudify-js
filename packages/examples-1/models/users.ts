export default new DbTableModel({
  // connection: 'postgres',
  table: 'users',
  columns: {
    id: { type: 'integer', primary: true },
    meta: { type: 'jsonb' },
    name: { type: 'varchar(64)' },
    email: { type: 'varchar(64)', validate: 'email' },
    created_at: { type: 'timestamptz' },
    updated_at: { type: 'timestamptz' },
    account: { type: 'integer', references: { table: 'accounts', column: 'id' } }
  },
})
