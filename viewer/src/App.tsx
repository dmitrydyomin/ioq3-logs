import { Games } from './games/Games';
import { Heatmap } from './games/Heatmap';
import { Insights } from './games/Insights';
import { Totals } from './games/Totals';
import { Notify } from './notify/Notify';

export const App: React.FC = () => (
  <div className="app">
    <Heatmap />
    <Totals />
    <Insights />
    <Games />
    <Notify />
  </div>
);
