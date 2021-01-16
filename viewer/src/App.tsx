import React from 'react';

import { Games } from './games/Games';
import { Heatmap } from './games/Heatmap';
import { Totals } from './games/Totals';
import { Notify } from './notify/Notify';

export const App: React.FC = () => (
  <div className="app">
    <Heatmap />
    <Totals />
    <Games />
    <Notify />
  </div>
);
