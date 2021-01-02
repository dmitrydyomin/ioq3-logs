exports.up = knex => knex.schema.createTable('kills', t => {
  t.increments('id');
  t.dateTime('created_at').notNull();

  t.integer('game_id').unsigned().notNull();
  t.foreign('game_id').references('games.id');

  t.integer('killer_id').unsigned();
  t.foreign('killer_id').references('players.id');

  t.integer('player_id').unsigned().notNull();
  t.foreign('player_id').references('players.id');

  t.integer('weapon').unsigned().notNull();
});

exports.down = knex => knex.schema.dropTable('kills');
