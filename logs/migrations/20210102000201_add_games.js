exports.up = knex => knex.schema.createTable('games', t => {
  t.increments('id');
  t.dateTime('started_at').notNull();
  t.dateTime('ended_at');
});

exports.down = knex => knex.schema.dropTable('games');
