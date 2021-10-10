import { Knex } from 'knex';
import { Service } from 'typedi';

@Service()
export class Config {
  app = {
    port: parseInt(process.env.PORT || '3001'),
  };

  client = {
    enabled: process.env.CLIENT_DISABLED !== '1',
    host: process.env.QUAKE_HOST || 'quake',
    port: parseInt(process.env.QUAKE_PORT || '3000'),
  };

  db: Knex.Config = {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: 'quake',
      user: 'quake',
      password: process.env.DB_PASSWORD || 'quake',
    },
  };

  players = {
    useIcons: process.env.USE_PLAYER_ICONS === '1',
  };

  sounds = {
    armorDelay: 22000,
    enabled: process.env.PLAY_SOUNDS === '1',
    playerId: 1,
  };
}
