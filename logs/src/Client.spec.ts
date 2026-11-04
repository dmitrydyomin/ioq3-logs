import 'reflect-metadata';

import net, { AddressInfo } from 'net';

import { Client } from './Client';
import { Config } from './Config';
import { Reader } from './Reader';

const waitFor = async (condition: () => boolean) => {
  const deadline = Date.now() + 3000;
  while (!condition()) {
    if (Date.now() > deadline) {
      throw new Error('Timed out waiting for condition');
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

const listen = (onConnection: (socket: net.Socket) => void, port = 0) =>
  new Promise<net.Server>((resolve) => {
    const server = net.createServer(onConnection);
    server.listen(port, 'localhost', () => resolve(server));
  });

const closeServer = (server: net.Server) =>
  new Promise((resolve) => server.close(resolve));

const portOf = (server: net.Server) => (server.address() as AddressInfo).port;

describe('Client', () => {
  let client: Client;
  let lines: string[];
  let processLine: jest.Mock;
  let reset: jest.Mock;
  let servers: net.Server[];
  let sockets: net.Socket[];

  const track = (socket: net.Socket) => {
    socket.on('error', () => {});
    sockets.push(socket);
  };

  // A hostname, because that is what runs in production and Node handles
  // connecting to one differently from connecting to an IP address.
  const start = (port: number) => {
    const config = {
      client: {
        host: 'localhost',
        keepAliveDelay: 1000,
        port,
        reconnectDelay: 10,
        reconnectMaxDelay: 20,
      },
    } as Config;
    client = new Client(config, { processLine, reset } as unknown as Reader);
    client.connect();
  };

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    lines = [];
    processLine = jest.fn(async (line: string) => {
      lines.push(line);
    });
    reset = jest.fn(async () => {});
    servers = [];
    sockets = [];
  });

  afterEach(async () => {
    client.stop();
    sockets.forEach((s) => s.destroy());
    await Promise.all(servers.map(closeServer));
    jest.restoreAllMocks();
  });

  test('joins lines split across chunks', async () => {
    const server = await listen((socket) => {
      track(socket);
      socket.write('Kill: 1 0');
      setTimeout(() => socket.write(' 10: a killed b\nItem: 1 x\n'), 20);
    });
    servers.push(server);
    start(portOf(server));

    await waitFor(() => lines.length === 2);
    expect(lines).toEqual(['Kill: 1 0 10: a killed b', 'Item: 1 x']);
  });

  test('keeps a multi-byte character split across chunks', async () => {
    const bytes = Buffer.from('Item: 1 é\n');
    const server = await listen((socket) => {
      track(socket);
      socket.write(bytes.subarray(0, 9));
      setTimeout(() => socket.write(bytes.subarray(9)), 20);
    });
    servers.push(server);
    start(portOf(server));

    await waitFor(() => lines.length === 1);
    expect(lines).toEqual(['Item: 1 é']);
  });

  test('receives lines again after the server closes the connection', async () => {
    let connections = 0;
    const server = await listen((socket) => {
      track(socket);
      connections += 1;
      if (connections === 1) {
        socket.end();
      } else {
        socket.write('InitGame: after reconnect\n');
      }
    });
    servers.push(server);
    start(portOf(server));

    await waitFor(() => lines.length === 1);
    expect(connections).toBe(2);
    expect(lines).toEqual(['InitGame: after reconnect']);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  test('reconnects when the server was gone for a while', async () => {
    let connections = 0;
    const onConnection = (socket: net.Socket) => {
      track(socket);
      connections += 1;
      if (connections > 1) {
        socket.write('InitGame: new server\n');
      }
    };
    const first = await listen(onConnection);
    const port = portOf(first);
    start(port);
    await waitFor(() => connections === 1);

    sockets.forEach((s) => s.destroy());
    await closeServer(first);
    await waitFor(() => reset.mock.calls.length > 0);
    await new Promise((resolve) => setTimeout(resolve, 100));

    servers.push(await listen(onConnection, port));

    await waitFor(() => lines.length === 1);
    expect(lines).toEqual(['InitGame: new server']);
  });

  test('keeps retrying when the server is down at startup', async () => {
    const probe = await listen(() => {});
    const port = portOf(probe);
    await closeServer(probe);

    start(port);
    await new Promise((resolve) => setTimeout(resolve, 50));

    servers.push(
      await listen((socket) => {
        track(socket);
        socket.write('InitGame: late start\n');
      }, port)
    );

    await waitFor(() => lines.length === 1);
    expect(lines).toEqual(['InitGame: late start']);
  });

  test('keeps going after a line fails', async () => {
    processLine.mockRejectedValueOnce(new Error('unknown client'));
    const server = await listen((socket) => {
      track(socket);
      socket.write('Kill: 1 0 10: bad\nItem: 1 x\n');
    });
    servers.push(server);
    start(portOf(server));

    await waitFor(() => lines.length === 1);
    expect(lines).toEqual(['Item: 1 x']);
    expect(console.error).toHaveBeenCalledTimes(1);
  });
});
