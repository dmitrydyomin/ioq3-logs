import { Get, JsonController, QueryParam } from 'routing-controllers';
import { Service } from 'typedi';

import { GameRepository } from './GameRepository';

@Service()
@JsonController('/games')
export class GameController {
  constructor(private repo: GameRepository) {}

  @Get()
  getGames(@QueryParam('all') all?: string) {
    return this.repo.getClientGames(all === '1');
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
