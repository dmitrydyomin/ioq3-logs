import { Get, JsonController } from 'routing-controllers';
import { GameRepository } from './GameRepository';

@JsonController('/games')
export class GameController {
  constructor(private repo: GameRepository) {}

  @Get()
  getGames() {
    return this.repo.getClientGames();
  }

  @Get('/heatmap')
  getHeatmap() {
    return [];
  }
}
