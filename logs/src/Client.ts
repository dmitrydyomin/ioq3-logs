import net from 'net';
import { Service } from 'typedi';

import { Config } from './Config';
import { Reader } from './Reader';

@Service()
export class Client {
  private attempts = 0;
  private reconnectTimer: NodeJS.Timeout | undefined;
  private socket: net.Socket | undefined;
  private stopped = false;

  constructor(private config: Config, private reader: Reader) {}

  connect() {
    const { host, keepAliveDelay, port } = this.config.client;

    // Every attempt needs a new socket. Calling connect() again on a socket
    // the server has closed can report success without any new connection.
    const socket = net.createConnection({ host, port });
    this.socket = socket;

    // Partial lines are kept here, a chunk can end in the middle of a line.
    let buffer = '';

    // Reassembles multi-byte characters split across chunks.
    socket.setEncoding('utf8');
    // The stream is legitimately quiet on an empty server, so silence can't be
    // used to detect a dead connection.
    socket.setKeepAlive(true, keepAliveDelay);

    socket.on('connect', () => {
      console.log('connected');
      this.attempts = 0;
    });

    socket.on('data', (data: string) => {
      const lines = (buffer + data).split('\n');
      buffer = lines.pop() || '';
      lines.filter(Boolean).forEach((line) => {
        this.reader.processLine(line, new Date()).catch((err) => {
          console.error(`Failed to process line "${line}":`, err);
        });
      });
    });

    // Always followed by 'close', which schedules the reconnect.
    socket.on('error', (err) => {
      console.error(`connection error: ${err.message}`);
    });

    socket.on('close', () => {
      if (this.stopped) {
        return;
      }
      console.log('disconnected');
      this.reader.reset();
      this.scheduleReconnect();
    });
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.reconnectTimer);
    this.socket?.destroy();
  }

  private scheduleReconnect() {
    const { reconnectDelay, reconnectMaxDelay } = this.config.client;
    const delay = Math.min(
      reconnectDelay * 2 ** this.attempts,
      reconnectMaxDelay
    );
    this.attempts += 1;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }
}
