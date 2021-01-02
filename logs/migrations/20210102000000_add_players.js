exports.up = knex => knex.schema.createTable('players', t => {
  t.increments('id');
  t.dateTime('created_at').notNull();
  t.dateTime('updated_at').notNull();

  t.string('name', 100).notNull().unique();
  t.string('model', 50).notNull();
});

exports.down = knex => knex.schema.dropTable('players');
