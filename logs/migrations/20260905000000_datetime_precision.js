// MySQL datetime columns default to a precision of 0, which rounds the
// millisecond part the application stores. Give every timestamp column
// millisecond precision, matching what a JS Date can hold.

const columns = [
  ['players', [['created_at', true], ['updated_at', true]]],
  ['games', [['started_at', true], ['ended_at', false]]],
  ['game_players', [['entered_at', true], ['left_at', false]]],
  ['kills', [['created_at', true]]],
  ['items', [['created_at', true]]],
];

const change = precision => async knex => {
  for (const [table, cols] of columns) {
    await knex.schema.alterTable(table, t => {
      for (const [name, notNull] of cols) {
        const c = t.dateTime(name, { precision });
        if (notNull) {
          c.notNull();
        }
        c.alter();
      }
    });
  }
};

exports.up = change(3);

exports.down = change(0);
