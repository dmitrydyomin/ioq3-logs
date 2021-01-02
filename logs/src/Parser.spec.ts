import { Parser } from './Parser';

test('parse kill', () => {
  const log = new Parser();

  expect(
    log.parseLine(
      'Kill: 1 0 10: Quakespeare killed Corporal Clegg by MOD_RAILGUN'
    )
  ).toEqual({
    weapon: 10,
    killer_client_id: 1,
    player_client_id: 0,
  });
});

test('parse item', () => {
  const log = new Parser();

  expect(log.parseLine('Item: 1 weapon_rocketlauncher')).toEqual({
    item: 'weapon_rocketlauncher',
    player_client_id: 1,
  });
});

test('parse user info', () => {
  const log = new Parser();

  expect(
    log.parseLine(
      'ClientUserinfoChanged: 1 n\\Quakespeare\\t\\0\\model\\ranger/default\\hmodel\\ranger/default\\g_redteam\\\\g_blueteam\\\\c1\\2\\c2\\5\\hc\\100\\w\\0\\l\\0\\tt\\0\\tl\\0'
    )
  ).toEqual({
    client_id: 1,
    model: 'ranger/default',
    name: 'Quakespeare',
    options: {
      n: 'Quakespeare',
      t: '0',
      model: 'ranger/default',
      hmodel: 'ranger/default',
      g_redteam: '',
      g_blueteam: '',
      c1: '2',
      c2: '5',
      hc: '100',
      w: '0',
      l: '0',
      tt: '0',
      tl: '0',
    },
  });
});
