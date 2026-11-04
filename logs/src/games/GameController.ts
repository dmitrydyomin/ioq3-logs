import {
  BadRequestError,
  Get,
  JsonController,
  QueryParam,
} from 'routing-controllers';
import { Service } from 'typedi';

import { GameRepository } from './GameRepository';
import { InsightsPeriod, insightsPeriods } from './GameTypes';
import { InsightsRepository } from './InsightsRepository';

@Service()
@JsonController('/games')
export class GameController {
  constructor(
    private repo: GameRepository,
    private insights: InsightsRepository
  ) {}

  @Get()
  getGames(@QueryParam('all') all?: string) {
    return this.repo.getClientGames(all === '1');
  }

  @Get('/heatmap')
  getHeatmap() {
    return this.repo.getHeatmap(new Date());
  }

  @Get('/insights')
  getInsights(@QueryParam('period') period?: string) {
    const value = (period || 'year') as InsightsPeriod;
    if (!insightsPeriods.includes(value)) {
      throw new BadRequestError(`Unknown period: ${period}`);
    }
    return this.insights.getInsights(value);
  }

  @Get('/totals')
  getTotals() {
    return this.repo.getTotals();
  }
}
