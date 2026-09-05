require('dotenv/config');

module.exports = {
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    database: 'quake',
    user: 'quake',
    password: process.env.DB_PASSWORD || 'quake',
  },
  migrations: {
    tableName: 'knex_migrations',
  },
};
