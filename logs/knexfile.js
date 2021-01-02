// require('dotenv/config');

module.exports = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: 'quake',
    user: 'quake',
    password: process.env.DB_PASSWORD || 'quake',
  },
  migrations: {
    tableName: 'knex_migrations'
  }
};
