import React from 'react';

import { Games } from './games/Games';
import { Heatmap } from './games/Heatmap';

export const App: React.FC = () => (
  <div className="app">
    <Heatmap />
    <Games />
  </div>
);
