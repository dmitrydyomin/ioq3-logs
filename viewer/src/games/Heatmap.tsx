import React, { useCallback, useMemo, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import useAxios from 'axios-hooks';

import './Heatmap.css';
import { HeatmapData } from './GameTypes';

type DayFill = 0 | 1 | 2 | 3 | 4;

interface HeatmapColumn {
  cells: {
    fill: DayFill | undefined;
    value: number | undefined;
    date: Dayjs;
  }[];
  title?: string;
}

const dayFills: Record<DayFill, string> = {
  0: '--color-calendar-graph-day-bg',
  1: '--color-calendar-graph-day-L1-bg',
  2: '--color-calendar-graph-day-L2-bg',
  3: '--color-calendar-graph-day-L3-bg',
  4: '--color-calendar-graph-day-L4-bg',
};

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const Heatmap: React.FC = () => {
  const [{ data, error, loading }] = useAxios<HeatmapData>(
    '/api/games/heatmap'
  );

  const byOffset = useMemo(() => {
    const res: Record<number, number> = {};
    if (data) {
      const start = dayjs(data.startDate);
      data.values.forEach(({ date, count }) => {
        const offset = dayjs(date).diff(start, 'day');
        res[offset] = count;
      });
    }
    return res;
  }, [data]);

  const columns = useMemo(() => {
    const res: HeatmapColumn[] = [];

    if (!data) {
      return res;
    }

    const start = dayjs(data.startDate);
    const offset = start.diff(start.clone().startOf('isoWeek'), 'day');
    const dayCount = dayjs(data.endDate).diff(start, 'day') + 1;
    const columnCount = Math.ceil((dayCount + offset) / 7);
    const max = Math.max(...Object.values(byOffset), 0);

    for (let i = 0; i < columnCount; i++) {
      const column: HeatmapColumn = {
        cells: [],
      };

      for (let j = 0; j < 7; j++) {
        const x = i * 7 + j - offset;
        const value = x >= 0 && x < dayCount ? byOffset[x] || 0 : undefined;
        const date = start.clone().add(x, 'day');
        if (date.get('date') === 1 && columnCount - i > 1) {
          column.title = date.format('MMM');
        }
        column.cells.push({
          date,
          fill:
            value === undefined
              ? undefined
              : (Math.ceil((value / max) * 4) as DayFill),
          value,
        });
      }

      res.push(column);
    }

    return res;
  }, [byOffset, data]);

  const [tooltip, setTooltip] = useState<
    { title: string; body: string; x: number; y: number } | undefined
  >();

  const onMouseEnter = useCallback(
    (e: React.MouseEvent<SVGRectElement>) => {
      const col = parseInt(e.currentTarget.getAttribute('data-col') || '');
      const row = parseInt(e.currentTarget.getAttribute('data-row') || '');
      const cell = columns[col].cells[row];

      setTooltip({
        x: 15 * col,
        y: 15 * row,
        title: `${cell.value} ${cell.value === 1 ? ' game' : 'games'}`,
        body: `on ${cell.date.format('MMM DD, YYYY')}`,
      });
    },
    [columns]
  );

  const onMouseLeave = useCallback((e: React.MouseEvent<SVGRectElement>) => {
    setTooltip(undefined);
  }, []);

  return (
    <div className="heatmap">
      {loading && 'loading...'}
      {error && `error: ${error.message}`}
      {data && (
        <svg width={828} height={128}>
          <g transform="translate(10,20)">
            {columns.map((col, i) => (
              <g key={i} transform={`translate(${15 * i}, 0)`}>
                {col.title && (
                  <text x={15} y={-8} className="month">
                    {col.title}
                  </text>
                )}
                {col.cells.map((c, j) =>
                  c.fill === undefined ? null : (
                    <rect
                      key={j}
                      className="day"
                      width={11}
                      height={11}
                      x={15}
                      y={15 * j}
                      fill={`var(${dayFills[c.fill]})`}
                      data-col={i}
                      data-row={j}
                      onMouseEnter={onMouseEnter}
                      onMouseLeave={onMouseLeave}
                    />
                  )
                )}
              </g>
            ))}
            {weekDays.map((d, i) => (
              <text
                key={i}
                textAnchor="start"
                className="wday"
                dx={-10}
                dy={8 + 15 * i}
                style={i % 2 === 1 ? { display: 'none' } : undefined}
              >
                {d}
              </text>
            ))}
          </g>
        </svg>
      )}
      {tooltip && (
        <div
          className="tooltip"
          style={{ top: tooltip.y - 29, left: tooltip.x - 53 }}
        >
          <strong>{tooltip.title}</strong> {tooltip.body}
        </div>
      )}
    </div>
  );
};
