import { Get, JsonController } from 'routing-controllers';
import { Service } from 'typedi';

import { GameRepository } from './GameRepository';

@Service()
@JsonController('/games')
export class GameController {
  constructor(private repo: GameRepository) {}

  @Get()
  getGames() {
    return this.repo.getClientGames();
  }

  @Get('/heatmap')
  getHeatmap() {
    return this.repo.getHeatmap(new Date());
  }

  @Get('/totals')
  getTotals() {
    return this.repo.getTotals();
  }
}
