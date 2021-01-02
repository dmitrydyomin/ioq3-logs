import { Service } from 'typedi';
import PQueue from 'p-queue';

import { Game } from './games/GameTypes';
import { GameRepository } from './games/GameRepository';
import { isClientInfo, isItem, isKill, Parser } from './Parser';
import { ItemInsert } from './items/ItemTypes';
import { ItemRepository } from './items/ItemRepository';
import { KillInsert } from './kills/KillTypes';
import { KillRepository } from './kills/KillRepository';
import { Player } from './players/PlayerTypes';
import { PlayerRepository } from './players/PlayerRepository';

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

  private async startGame() {
    this.game = await this.gameRepo.start();
  }

  private async getGameId() {
    if (!this.game) {
      await this.startGame();
    }
    return this.game?.id as number;
  }

  private async handleGameLines(line: string) {
    const [start, rest] = line.split(':');
    switch (start) {
      case 'InitGame':
        await this.startGame();
        return true;
      case 'ShutdownGame':
      case 'Exit':
        if (this.game) {
          await this.gameRepo.end(this.game.id);
        }
        this.game = undefined;
        return true;
      case 'ClientBegin':
        {
          const clientId = parseInt(rest);
          await this.gameRepo.playerEnter(
            await this.getGameId(),
            this.getPlayerId(clientId)
          );
        }
        break;
      case 'ClientDisconnect':
        {
          const clientId = parseInt(rest);
          await this.gameRepo.playerLeave(
            await this.getGameId(),
            this.getPlayerId(clientId)
          );
        }
        break;
      default:
        return false;
    }
  }

  private async processLineRaw(line: string) {
    if (await this.handleGameLines(line)) {
      return;
    }
    const parsed = this.parser.parseLine(line);
    if (parsed === undefined) {
      return;
    }
    if (isClientInfo(parsed)) {
      this.players[parsed.client_id] = await this.playerRepo.findOrCreate({
        name: parsed.name,
        model: parsed.model,
      });
    } else if (isKill(parsed)) {
      const game_id = await this.getGameId();
      const data: KillInsert = {
        player_id: this.getPlayerId(parsed.player_client_id),
        killer_id:
          parsed.killer_client_id === CLIENT_ID_WORLD
            ? null
            : this.getPlayerId(parsed.killer_client_id),
        weapon: parsed.weapon,
        game_id,
      };
      await this.killRepo.create(data);
      if (data.killer_id === null || data.killer_id === data.player_id) {
        await this.gameRepo.subScore(game_id, data.player_id);
      } else {
        await this.gameRepo.addScore(game_id, data.killer_id);
      }
    } else if (isItem(parsed)) {
      const data: ItemInsert = {
        player_id: this.getPlayerId(parsed.player_client_id),
        item: parsed.item,
        game_id: await this.getGameId(),
      };
      await this.itemRepo.create(data);
    }
  }

  async processLine(line: string) {
    await this.queue.add(() => this.processLineRaw(line));
  }
}
