import PQueue from 'p-queue';
import { Service } from 'typedi';

import { isClientInfo, isItem, isKill, Parser } from './Parser';
import { GameRepository } from './games/GameRepository';
import { Game } from './games/GameTypes';
import { ItemRepository } from './items/ItemRepository';
import { ItemInsert } from './items/ItemTypes';
import { KillRepository } from './kills/KillRepository';
import { KillInsert } from './kills/KillTypes';
import { NotifyController } from './notify/NotifyController';
import { PlayerRepository } from './players/PlayerRepository';
import { Player } from './players/PlayerTypes';

const CLIENT_ID_WORLD = 1022;

@Service()
export class Reader {
  private players: Record<number, Player> = {};
  private game: Game | undefined;
  private queue: PQueue;

  constructor(
    private gameRepo: GameRepository,
    private itemRepo: ItemRepository,
    private killRepo: KillRepository,
    private notify: NotifyController,
    private parser: Parser,
    private playerRepo: PlayerRepository
  ) {
    this.queue = new PQueue({ concurrency: 1 });
  }

  private getPlayerId(clientId: number): number {
    if (!this.players[clientId]) {
      throw new Error(`Failed to find player id for client id ${clientId}`);
    }
    return this.players[clientId].id;
  }

  private async startGame(date: Date) {
    this.game = await this.gameRepo.start(date);
  }

  private async getGameId(date: Date) {
    if (!this.game) {
      await this.startGame(date);
    }
    return this.game?.id as number;
  }

  private async handleGameLines(line: string, date: Date) {
    const [start, rest] = line.split(':');
    switch (start) {
      case 'InitGame':
        await this.startGame(date);
        return true;
      case 'ShutdownGame':
      case 'Exit':
        if (this.game) {
          await this.gameRepo.end(this.game.id, date);
        }
        this.game = undefined;
        this.notify.cancelArmor();
        this.notify.notifyGameEnd();
        return true;
      case 'ClientBegin':
        {
          const clientId = parseInt(rest);
          await this.gameRepo.playerEnter(
            await this.getGameId(date),
            this.getPlayerId(clientId),
            date
          );
        }
        break;
      case 'ClientDisconnect':
        {
          const clientId = parseInt(rest);
          await this.gameRepo.playerLeave(
            await this.getGameId(date),
            this.getPlayerId(clientId)
          );
        }
        break;
      default:
        return false;
    }
  }

  private async processLineRaw(line: string, date: Date) {
    if (await this.handleGameLines(line, date)) {
      return;
    }
    const parsed = this.parser.parseLine(line);
    if (parsed === undefined) {
      return;
    }
    if (isClientInfo(parsed)) {
      this.players[parsed.client_id] = await this.playerRepo.findOrCreate(
        {
          name: parsed.name,
          model: parsed.model,
        },
        date
      );
    } else if (isKill(parsed)) {
      const game_id = await this.getGameId(date);
      const data: KillInsert = {
        player_id: this.getPlayerId(parsed.player_client_id),
        killer_id:
          parsed.killer_client_id === CLIENT_ID_WORLD
            ? null
            : this.getPlayerId(parsed.killer_client_id),
        weapon: parsed.weapon,
        game_id,
      };
      await this.killRepo.create(data, date);
      if (data.killer_id === null || data.killer_id === data.player_id) {
        await this.gameRepo.subScore(game_id, data.player_id);
      } else {
        await this.gameRepo.addScore(game_id, data.killer_id);
      }
      this.notify.notifyKill(data.player_id);
    } else if (isItem(parsed)) {
      const data: ItemInsert = {
        player_id: this.getPlayerId(parsed.player_client_id),
        item: parsed.item,
        game_id: await this.getGameId(date),
      };
      await this.itemRepo.create(data, date);
      if (parsed.item === 'item_armor_body') {
        this.notify.notifyArmor();
      }
    }
  }

  async processLine(line: string, date: Date) {
    await this.queue.add(() => this.processLineRaw(line, date));
  }
}
