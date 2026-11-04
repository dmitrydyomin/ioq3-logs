import useAxios from 'axios-hooks';
import dayjs from 'dayjs';
import { ReactNode, useMemo, useState } from 'react';
import { GameInsights, InsightsPeriod, InsightsPlayer } from './GameTypes';
import './Insights.css';

type Timeline = GameInsights['timeline'];

interface Tooltip {
  body: ReactNode;
  left: number;
}

// Below this a win rate says nothing, it's a handful of lucky games.
const minEdgeGames = 5;

const periods: { value: InsightsPeriod; label: string }[] = [
  { value: 'month', label: 'Last 30 days' },
  { value: 'year', label: 'Last 12 months' },
  { value: 'all', label: 'All time' },
];

const percent = (value: number, total: number) =>
  total ? `${Math.round((value / total) * 100)}%` : '–';

const plural = (count: number, word: string) =>
  `${count.toLocaleString('en-US')} ${word}${count === 1 ? '' : 's'}`;

const formatBucket = (date: string, bucket: GameInsights['bucket']) => {
  const d = dayjs(date);
  if (bucket === 'day') {
    return d.format('D MMM');
  }
  if (bucket === 'month') {
    return d.format('MMM YYYY');
  }
  return `Q${Math.floor(d.month() / 3) + 1} ${d.year()}`;
};

const axisLabel = (date: string, bucket: GameInsights['bucket']) =>
  bucket === 'month' ? dayjs(date).format('MMM') : formatBucket(date, bucket);

// Round steps for the axis, so that its labels are 1, 2, 5 or 10 based.
const niceStep = (max: number) => {
  const raw = max / 3;
  const scale = 10 ** Math.floor(Math.log10(raw || 1));
  const step = [1, 2, 5, 10].find((s) => s * scale >= raw) || 10;
  return Math.max(step * scale, 1);
};

const Legend: React.FC<{ players: InsightsPlayer[] }> = ({ players }) => (
  <div className="insights-legend">
    {players.map((p, i) => (
      <span key={p.id}>
        <i className={`insights-swatch player-${i}`} />
        {p.name}
      </span>
    ))}
  </div>
);

const Comparison: React.FC<{ data: GameInsights }> = ({ data }) => {
  const [a, b] = data.players;
  const kd = (p: InsightsPlayer) => p.frags / (p.deaths || 1);

  const rows: {
    label: string;
    value: (p: InsightsPlayer) => number;
    format?: (value: number) => string;
    best?: 'high' | 'low';
  }[] = [
    { label: 'Wins', value: (p) => p.wins, best: 'high' },
    {
      label: 'Win rate',
      value: (p) => p.wins / (data.games || 1),
      format: (v) => percent(v, 1),
      best: 'high',
    },
    {
      label: 'Average score',
      value: (p) => p.avgScore,
      format: (v) => v.toFixed(1),
      best: 'high',
    },
    { label: 'Best score', value: (p) => p.bestScore, best: 'high' },
    { label: 'Frags', value: (p) => p.frags, best: 'high' },
    { label: 'Deaths', value: (p) => p.deaths, best: 'low' },
    {
      label: 'Frags per death',
      value: kd,
      format: (v) => v.toFixed(2),
      best: 'high',
    },
    { label: 'Void and falling deaths', value: (p) => p.worldDeaths, best: 'low' },
    { label: 'Suicides', value: (p) => p.suicides, best: 'low' },
    { label: 'Longest win streak', value: (p) => p.longestStreak, best: 'high' },
    { label: 'Current win streak', value: (p) => p.currentStreak },
  ];

  return (
    <table className="insights-comparison">
      <thead>
        <tr>
          <th scope="col">
            <span className="visually-hidden">Measure</span>
          </th>
          {data.players.map((p, i) => (
            <th key={p.id} scope="col">
              <i className={`insights-swatch player-${i}`} />
              {p.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(({ best, format, label, value }) => {
          const values = [value(a), value(b)];
          const top = best === 'low' ? Math.min(...values) : Math.max(...values);
          return (
            <tr key={label}>
              <th scope="row">{label}</th>
              {values.map((v, i) => (
                <td
                  key={i}
                  className={
                    best && v === top && values[0] !== values[1]
                      ? 'insights-best'
                      : undefined
                  }
                >
                  {format ? format(v) : v.toLocaleString('en-US')}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

const TimelineChart: React.FC<{ data: GameInsights }> = ({ data }) => {
  const { bucket, players, timeline } = data;
  const [tooltip, setTooltip] = useState<Tooltip>();

  const { step, top } = useMemo(() => {
    const max = Math.max(
      ...timeline.map((t) => t.wins[0] + t.wins[1]),
      1
    );
    const step = niceStep(max);
    return { step, top: Math.ceil(max / step) * step };
  }, [timeline]);

  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);

  const labelEvery = timeline.length > 12 ? Math.ceil(timeline.length / 6) : 1;

  const show = (entry: Timeline[number], index: number) =>
    setTooltip({
      left: Math.min(Math.max(((index + 0.5) / timeline.length) * 100, 16), 84),
      body: (
        <>
          <div className="insights-tooltip-title">
            {formatBucket(entry.date, bucket)}
          </div>
          {players.map((p, i) => (
            <div key={p.id}>
              <i className={`insights-line-key player-${i}`} />
              <strong>{entry.wins[i]}</strong> {p.name}
            </div>
          ))}
          {entry.draws > 0 && <div>{plural(entry.draws, 'draw')}</div>}
        </>
      ),
    });

  return (
    <div className="insights-timeline">
      <div className="insights-plot">
        {ticks.map((value) => (
          <div
            key={value}
            className="insights-tick"
            style={{ bottom: `${(value / top) * 100}%` }}
          >
            <span>{value}</span>
          </div>
        ))}
        <div className="insights-columns">
          {timeline.map((entry, i) => {
            const total = entry.wins[0] + entry.wins[1];
            const label = `${formatBucket(entry.date, bucket)}: ${players
              .map((p, j) => `${p.name} ${entry.wins[j]}`)
              .join(', ')}`;
            return (
              <div
                key={entry.date}
                className="insights-column"
                role="img"
                aria-label={label}
                tabIndex={0}
                onBlur={() => setTooltip(undefined)}
                onFocus={() => show(entry, i)}
                onPointerEnter={() => show(entry, i)}
                onPointerLeave={() => setTooltip(undefined)}
              >
                <div
                  className="insights-stack"
                  style={{ height: `${(total / top) * 100}%` }}
                >
                  {[1, 0].map(
                    (slot) =>
                      entry.wins[slot] > 0 && (
                        <div
                          key={slot}
                          className={`player-${slot}`}
                          style={{ flexGrow: entry.wins[slot] }}
                        />
                      )
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {tooltip && (
          <div className="insights-tooltip" style={{ left: `${tooltip.left}%` }}>
            {tooltip.body}
          </div>
        )}
      </div>
      <div className="insights-axis">
        {timeline.map((entry, i) => (
          <div key={entry.date}>
            {i % labelEvery === 0 && <span>{axisLabel(entry.date, bucket)}</span>}
          </div>
        ))}
      </div>
      <details className="insights-details">
        <summary>Show as a table</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Period</th>
              {players.map((p) => (
                <th key={p.id} scope="col">
                  {p.name}
                </th>
              ))}
              <th scope="col">Draws</th>
            </tr>
          </thead>
          <tbody>
            {timeline.map((entry) => (
              <tr key={entry.date}>
                <th scope="row">{formatBucket(entry.date, bucket)}</th>
                <td>{entry.wins[0]}</td>
                <td>{entry.wins[1]}</td>
                <td>{entry.draws}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
};

const WeaponChart: React.FC<{ data: GameInsights }> = ({ data }) => {
  const { players, weapons } = data;
  const max = Math.max(...weapons.flatMap((w) => w.frags), 1);

  return (
    <div className="insights-weapons">
      {weapons.map(({ frags, weapon }) => (
        <div key={weapon} className="insights-weapon">
          <div className="insights-row-label">{weapon}</div>
          <div className="insights-bars">
            {players.map((p, i) => (
              <div key={p.id} className="insights-bar-row">
                {frags[i] > 0 && (
                  <div
                    className={`insights-bar player-${i}`}
                    style={{ width: `${(frags[i] / max) * 75}%` }}
                  />
                )}
                <span>
                  {frags[i].toLocaleString('en-US')}
                  <span className="insights-share">
                    {' '}
                    · {percent(frags[i], p.frags)}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const EdgeChart: React.FC<{ data: GameInsights }> = ({ data }) => {
  const edges = data.edges.filter((e) => e.games >= minEdgeGames);

  if (edges.length === 0) {
    return (
      <p className="insights-note">
        Not enough decided games in this period. Each row needs at least{' '}
        {minEdgeGames}.
      </p>
    );
  }

  return (
    <div className="insights-edges">
      <div className="insights-edge insights-edge-scale">
        <div />
        <div className="insights-edge-track">
          <span>Even, 50%</span>
        </div>
        <div />
      </div>
      {edges.map(({ games, label, wins }) => {
        const rate = (wins / games) * 100;
        return (
          <div key={label} className="insights-edge">
            <div className="insights-row-label">{label}</div>
            <div className="insights-edge-track">
              <div
                className={`insights-edge-bar ${rate < 50 ? 'below' : ''}`}
                style={{
                  left: `${Math.min(rate, 50)}%`,
                  width: `${Math.abs(rate - 50)}%`,
                }}
              />
            </div>
            <div className="insights-edge-value">
              <strong>{percent(wins, games)}</strong> of{' '}
              {games.toLocaleString('en-US')}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const Insights: React.FC = () => {
  const [period, setPeriod] = useState<InsightsPeriod>('year');
  const [{ data, error, loading }] = useAxios<GameInsights>({
    url: '/api/games/insights',
    params: { period },
  });

  return (
    <section className="insights" aria-labelledby="insights-title">
      <div className="insights-header">
        <h2 id="insights-title">Head to head</h2>
        <div className="insights-filter" role="group" aria-label="Period">
          {periods.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              aria-pressed={period === value}
              onClick={() => setPeriod(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && `error: ${error.message}`}
      {!data && loading && 'loading...'}

      {data && (
        <div className={loading ? 'insights-body stale' : 'insights-body'}>
          {data.games === 0 ? (
            <p className="insights-note">
              {data.players[0].name && data.players[1].name
                ? `${data.players[0].name} and ${data.players[1].name} played no games in this period.`
                : 'No games to compare yet.'}
            </p>
          ) : (
            <>
              <p className="insights-note">
                {plural(data.games, 'game')} between {data.players[0].name} and{' '}
                {data.players[1].name}
                {data.draws > 0 && `, ${plural(data.draws, 'draw')}`}
              </p>
              <Comparison data={data} />

              <h3>Wins over time</h3>
              <Legend players={data.players} />
              <TimelineChart data={data} />

              <h3>Frags by weapon</h3>
              <p className="insights-note">
                Frags, and each weapon's share of that player's total. Splash
                damage counts as its weapon.
              </p>
              <Legend players={data.players} />
              <WeaponChart data={data} />

              <h3>What goes with a win</h3>
              <p className="insights-note">
                How often the player with the edge won that game. Picking up
                more can also be a result of winning, not only a cause.
              </p>
              <EdgeChart data={data} />
            </>
          )}
        </div>
      )}
    </section>
  );
};
