import React, { useMemo } from 'react';
import useAxios from 'axios-hooks';
import dayjs from 'dayjs';

import { Game } from './GameTypes';

export const Games: React.FC = () => {
  const [{ data, error, loading }] = useAxios<Game[]>('/api/games');

  const table = useMemo(() => {
    const header: string[] = ['Game started at'];
    const body: string[][] = [];

    if (data) {
      data.forEach((g, i) => {
        if (i === 0) {
          g.players.forEach((p) => {
            header[p.id] = p.name;
          });
        }
        let line: string[] = [
          dayjs(g.started_at).format('DD.MM.YYYY HH:mm:ss'),
        ];
        g.players.forEach((p) => {
          line[p.id] = `${p.score}`;
        });
        body.push(line);
      });
    }

    return {
      header,
      body,
    };
  }, [data]);

  return (
    <div className="games">
      {loading && 'loading...'}
      {error && `error: ${error.message}`}

      <table>
        <thead>
          <tr>
            {table.header.map((c, i) => (
              <th key={i}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.body.map((r, i) => (
            <tr>
              {r.map((c, j) => (
                <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
