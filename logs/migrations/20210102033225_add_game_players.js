exports.up = knex => knex.schema.createTable('game_players', t => {
  t.increments('id');
  t.dateTime('entered_at').notNull();
  t.dateTime('left_at');

  t.integer('game_id').unsigned().notNull();
  t.foreign('game_id').references('games.id');

  t.integer('player_id').unsigned().notNull();
  t.foreign('player_id').references('players.id');

  t.integer('score').notNull();

  t.unique(['game_id', 'player_id']);
});

exports.down = knex => knex.schema.dropTable('game_players');
