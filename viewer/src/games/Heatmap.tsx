import useAxios from 'axios-hooks';
import React from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';

import 'react-calendar-heatmap/dist/styles.css';
import { HeatmapData } from './GameTypes';

export const Heatmap: React.FC = () => {
  const [{ data, error, loading }] = useAxios<HeatmapData>(
    '/api/games/heatmap'
  );

  return (
    <div className="heatmap">
      {loading && 'loading...'}
      {error && `error: ${error.message}`}
      {data && <CalendarHeatmap {...data} />}
    </div>
  );
};
