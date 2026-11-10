import useAxios from 'axios-hooks';
import { useMemo } from 'react';
import { TotalData } from './GameTypes';
import { PlayerHead } from './PlayerHead';
import { useHeadMotion } from './useHeadMotion';
import './Totals.css';

export const Totals: React.FC = () => {
  const [{ data, error, loading }] = useAxios<TotalData>('/api/games/totals');

  const { motion, available, status, toggle } = useHeadMotion();

  const totalWins = useMemo(
    () => (data?.players || []).reduce((sum, p) => sum + p.wins, 0),
    [data]
  );

  return (
    <div className="totals">
      {loading && 'loading...'}
      {error && `error: ${error.message}`}

      {data && (
        <>
          <div className="icons">
            {data.players.map((p, i) => (
              <PlayerHead key={p.id} name={p.name} model={p.model} icon={p.icon} index={i} motion={motion} />
            ))}
          </div>

          <div className="score">
            {data.players.map((p, i) => (
              <div key={p.id} className={`score-${i}`}>
                <div className="wins">{p.wins}</div>
                <div className="name">{p.name}</div>
              </div>
            ))}
          </div>
          <div className="bars">
            {data.players.map((p, i) => (
              <div
                key={p.id}
                className={`bar-${i}`}
                style={{ width: `${(p.wins / totalWins) * 100}%` }}
              ></div>
            ))}
          </div>
          {available && data.players.some(({ model }) => model) && (
            <div className="head-motion">
              <button type="button" onClick={toggle} disabled={status === 'requesting'}>
                {status === 'on' ? 'Disable tilt' : 'Enable tilt'}
              </button>
              {status === 'denied' && <span role="status"> Motion access is unavailable.</span>}
            </div>
          )}
        </>
      )}
    </div>
  );
};
