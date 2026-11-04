# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Collects stats from an ioquake3 (Quake 3) dedicated server and shows them on a web page. There is no root `package.json`; the repo holds three separately built parts:

- **Root** (`Dockerfile`, `entrypoint.sh`, `pipe.js`): the game server image. `ioq3ded` output is piped into `pipe.js`, which rebroadcasts each line to TCP clients on port 3000.
- **`logs/`**: Node/TypeScript backend. It reads that TCP stream, writes to MySQL, and serves the REST API and socket.io on port 3001.
- **`viewer/`**: React 19 + Vite frontend, served by nginx in production.

## Commands

Install dependencies and run these inside `logs/` or `viewer/`.

`logs/`:

```sh
npm start                                  # dev server (nodemon + ts-node, loads .env)
npm test                                   # all tests (jest)
npx jest src/Parser.spec.ts -t 'parse kill'  # single test
npx tsc --noEmit                           # typecheck
npm run build                              # compile to build/
npm run serve                              # run compiled build
npm run migrate                            # apply knex migrations
npm run migrate:rollback
npx ts-node -r dotenv/config src/utils/import.ts <file>  # replay a saved log
```

`viewer/`:

```sh
npm run dev      # Vite dev server, proxies to localhost:3001
npm run build    # tsc -b && vite build
npm run lint     # eslint
```

`logs/` has no linter and `viewer/` has no tests.

## Configuration

All backend settings live in `logs/src/Config.ts`, read from env vars (`logs/.env` in dev). `logs/knexfile.js` duplicates the DB connection settings, so change both together. The database name and user are hardcoded to `quake`.

- `CLIENT_DISABLED=1` skips the game server connection, which lets you run the API without a Quake server.
- `QUAKE_HOST` / `QUAKE_PORT` default to `quake:3000`.
- `DB_HOST` / `DB_PORT` / `DB_PASSWORD` set the MySQL connection.
- `PLAY_SOUNDS=1` and `USE_PLAYER_ICONS=1` enable optional features.

## Architecture

### Ingestion pipeline

`Client` (TCP) → `Reader` → `Parser` → repositories → MySQL, with `NotifyController` pushing live events.

- `Reader` is the core of the backend. It handles game lifecycle lines itself (`InitGame`, `ShutdownGame`, `Exit`, `ClientBegin`, `ClientDisconnect`) and delegates `Kill`, `Item`, and `ClientUserinfoChanged` to `Parser`.
- Lines go through a `PQueue` with concurrency 1, so they are processed strictly in order. Keep it that way, because each line depends on the state left by the previous ones.
- `Reader` keeps the current game and the client id → player map in memory only. Client ids are per-connection slots and player identity comes from `ClientUserinfoChanged`. `getPlayerId` throws for an unknown client id, so `Reader` needs to see a client's userinfo line before that client's other events. A backend started mid-game hits this, and `Client` logs and skips those lines.
- `Client` opens a new socket for every reconnect, because reusing one is what used to leave it silently receiving nothing. On disconnect it calls `Reader.reset()`, as client ids can't be trusted across a game server restart.
- A game normally starts on `InitGame`, but the first event creates one if `InitGame` was missed. After `Exit` or `ShutdownGame`, `Reader` ignores game events until the next `InitGame`, because the server keeps logging during the end screen and can sit there for hours when empty. Only `ClientUserinfoChanged` is still processed.
- Players are matched by name (`PlayerRepository.findOrCreate`).
- Client id 1022 is the world (for example, falling deaths) and is stored as `killer_id = null`. World kills and suicides subtract a point; other kills add one.
- `utils/import.ts` replays timestamped log files through the same `Reader`, which is why `Reader` methods take an explicit `date` rather than using the current time.

### Backend conventions

- `typedi` provides singleton `@Service()` classes. Entry points must import `reflect-metadata` first.
- HTTP uses `routing-controllers` and sockets use `socket-controllers`; both are registered in `Server.ts`, so add new controllers there.
- `NotifyController` is both a socket controller and a service injected into `Reader`, and it relies on being the same container instance.
- Each domain folder (`games/`, `players/`, `kills/`, `items/`) has a `*Repository.ts` wrapping knex and a `*Types.ts`.

### Stats visibility

`games.show_in_stats` decides what the viewer sees, and every read endpoint filters on it. `GameRepository.showInStats` sets it once when a game ends. A game counts if it lasted at least 9 minutes, more than one player joined within 10 seconds of the start, and at least one of those players stayed to the end.

### Frontend and API

- Routes have no `/api` prefix on the backend. Both `viewer/vite.config.ts` and `viewer/nginx.conf` strip it, so a proxy change must be made in both.
- `viewer/` does not share code with `logs/`. `GameTypes` and the `EventType` enum are duplicated across the two.
- `EventType` values for sounds also map to file names: type `n` plays `viewer/public/sounds/<n>.ogg`.
- The `/notify` socket namespace sends sound events, plus `GameEnd`, which makes the page reload to pick up new data.

### Insights

`GET /games/insights?period=month|year|all` backs the "Head to head" section. `InsightsRepository` runs the queries and `GameInsights.ts` does the calculations as a pure function, which is where to add and unit test new figures. It compares the two players with the most games over all time, and only in games they both played, so their order and colors don't change with the period. Ties count as draws here, while `getTotals` gives a tie to whoever sorts first.

### Database

The project moved from PostgreSQL to MySQL; `utils/pgToMysql.ts` (`npm run migrate:data`) is the one-off data copy, and `pg` remains only for it.

- Timestamp columns must use `{ precision: 3 }`, since MySQL `datetime` otherwise drops milliseconds.
- MySQL `datetime` stores wall-clock time converted through the process timezone, so the app and tools must run with the same `TZ`.
- `Config.ts` has a `typeCast` that turns `tinyint(1)` back into booleans.
- Knex inserts return `[id]`, with no `RETURNING`; follow the existing `findOne` after insert pattern.

## Deployment

`docker-compose.yml` runs the `quake` and `logs` services from prebuilt images (`dmitrydyomin/ioq3`, `dmitrydyomin/ioq3-logs`) and expects an external `mysql_default` network. The `viewer` image is not in this compose file, and its nginx config expects to reach the backend at host `logs`. The game server image needs `pak0.pk3` mounted at `/pak0.pk3`, because the game data is not distributable.

Production runs on k3s; the manifests are in the `ddemin/c1k3s` repo (`apps/quake3/`). See [docs/server-hang.md](docs/server-hang.md) for what to capture when the server hangs on "awaiting gamestate".
