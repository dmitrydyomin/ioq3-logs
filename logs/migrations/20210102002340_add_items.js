exports.up = knex => knex.schema.createTable('items', t => {
  t.increments('id');
  t.dateTime('created_at').notNull();

  t.integer('game_id').unsigned().notNull();
  t.foreign('game_id').references('games.id');

  t.integer('player_id').unsigned().notNull();
  t.foreign('player_id').references('players.id');

  t.string('item', 50);
});

exports.down = knex => knex.schema.dropTable('items');
