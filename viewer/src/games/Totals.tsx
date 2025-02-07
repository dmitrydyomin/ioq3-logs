import useAxios from 'axios-hooks';
import { useMemo } from 'react';
import { TotalData } from './GameTypes';
import './Totals.css';

export const Totals: React.FC = () => {
  const [{ data, error, loading }] = useAxios<TotalData>('/api/games/totals');

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
              <img
                key={p.id}
                className={`icon-${i}`}
                src={p.icon}
                alt={`${p.name}'s icon`}
              />
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
        </>
      )}
    </div>
  );
};
