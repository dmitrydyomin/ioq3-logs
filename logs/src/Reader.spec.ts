import 'reflect-metadata';

import { Parser } from './Parser';
import { Reader } from './Reader';

const date = new Date('2026-11-04T12:00:00Z');
const userinfo = (clientId: number, name: string) =>
  `ClientUserinfoChanged: ${clientId} n\\${name}\\model\\ranger/default`;

describe('Reader', () => {
  let gameRepo: Record<string, jest.Mock>;
  let itemRepo: Record<string, jest.Mock>;
  let killRepo: Record<string, jest.Mock>;
  let notify: Record<string, jest.Mock>;
  let playerRepo: Record<string, jest.Mock>;
  let reader: Reader;

  beforeEach(() => {
    let gameId = 0;
    let playerId = 0;
    gameRepo = {
      addScore: jest.fn(),
      end: jest.fn(),
      playerEnter: jest.fn(),
      playerLeave: jest.fn(),
      start: jest.fn(async () => ({ id: ++gameId })),
      subScore: jest.fn(),
    };
    itemRepo = { create: jest.fn() };
    killRepo = { create: jest.fn() };
    notify = {
      cancelArmor: jest.fn(),
      notifyArmor: jest.fn(),
      notifyGameEnd: jest.fn(),
      notifyKill: jest.fn(),
    };
    playerRepo = {
      findOrCreate: jest.fn(async () => ({ id: ++playerId })),
    };
    reader = new Reader(
      gameRepo as never,
      itemRepo as never,
      killRepo as never,
      notify as never,
      new Parser(),
      playerRepo as never
    );
  });

  test.each([
    ['ClientBegin: 0'],
    ['ClientDisconnect: 0'],
    ['Kill: 1 0 10: a killed b'],
    ['Item: 0 weapon_rocketlauncher'],
  ])('%s from an unknown client creates no game', async (line) => {
    await expect(reader.processLine(line, date)).rejects.toThrow(
      'Failed to find player id'
    );
    expect(gameRepo.start).not.toHaveBeenCalled();
  });

  test('keeps processing after a failed line', async () => {
    await expect(reader.processLine('ClientBegin: 0', date)).rejects.toThrow();

    await reader.processLine(userinfo(0, 'a'), date);
    await reader.processLine('ClientBegin: 0', date);

    expect(gameRepo.playerEnter).toHaveBeenCalledWith(1, 1, date);
  });

  test('reset forgets the players and the game', async () => {
    await reader.processLine('InitGame: x', date);
    await reader.processLine(userinfo(0, 'a'), date);
    await reader.reset();

    await expect(reader.processLine('ClientBegin: 0', date)).rejects.toThrow(
      'Failed to find player id'
    );

    await reader.processLine(userinfo(0, 'b'), date);
    await reader.processLine('ClientBegin: 0', date);

    expect(gameRepo.start).toHaveBeenCalledTimes(2);
    expect(gameRepo.playerEnter).toHaveBeenCalledWith(2, 2, date);
    expect(notify.cancelArmor).toHaveBeenCalledTimes(1);
  });

  describe.each([['Exit: Timelimit hit.'], ['ShutdownGame:']])(
    'after "%s"',
    (end) => {
      const startGame = async () => {
        await reader.processLine('InitGame: x', date);
        await reader.processLine(userinfo(0, 'a'), date);
        await reader.processLine(userinfo(1, 'b'), date);
        await reader.processLine(end, date);
      };

      test.each([
        ['ClientBegin: 0'],
        ['ClientDisconnect: 0'],
        ['Kill: 1 0 10: b killed a'],
        ['Item: 0 weapon_shotgun'],
      ])('%s creates no game', async (line) => {
        await startGame();
        await reader.processLine(line, date);

        expect(gameRepo.start).toHaveBeenCalledTimes(1);
        expect(gameRepo.playerEnter).not.toHaveBeenCalled();
        expect(gameRepo.playerLeave).not.toHaveBeenCalled();
        expect(itemRepo.create).not.toHaveBeenCalled();
        expect(killRepo.create).not.toHaveBeenCalled();
      });

      test('events from an unknown client are ignored quietly', async () => {
        await startGame();
        await reader.processLine('ClientBegin: 5', date);

        expect(gameRepo.start).toHaveBeenCalledTimes(1);
      });

      test('the next InitGame starts recording again', async () => {
        await startGame();
        await reader.processLine('Item: 0 weapon_shotgun', date);
        await reader.processLine('InitGame: y', date);
        await reader.processLine('ClientBegin: 0', date);

        expect(gameRepo.start).toHaveBeenCalledTimes(2);
        expect(gameRepo.playerEnter).toHaveBeenCalledWith(2, 1, date);
      });

      test('players changed in between are still known', async () => {
        await startGame();
        await reader.processLine(userinfo(2, 'c'), date);
        await reader.processLine('InitGame: y', date);
        await reader.processLine('ClientBegin: 2', date);

        expect(gameRepo.playerEnter).toHaveBeenCalledWith(2, 3, date);
      });

      test('a reset allows a game without InitGame again', async () => {
        await startGame();
        await reader.reset();
        await reader.processLine(userinfo(0, 'a'), date);
        await reader.processLine('ClientBegin: 0', date);

        expect(gameRepo.start).toHaveBeenCalledTimes(2);
      });
    }
  );

  test('joining mid-session without InitGame still creates a game', async () => {
    await reader.processLine(userinfo(0, 'a'), date);
    await reader.processLine('ClientBegin: 0', date);

    expect(gameRepo.start).toHaveBeenCalledTimes(1);
    expect(gameRepo.playerEnter).toHaveBeenCalledWith(1, 1, date);
  });

  test('reset waits for lines received before it', async () => {
    const line = reader.processLine(userinfo(0, 'a'), date);
    const reset = reader.reset();
    await Promise.all([line, reset]);

    expect(playerRepo.findOrCreate).toHaveBeenCalledTimes(1);
    await expect(reader.processLine('ClientBegin: 0', date)).rejects.toThrow(
      'Failed to find player id'
    );
  });
});
