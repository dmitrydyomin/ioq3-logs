import net from 'net';
import { Service } from 'typedi';

import { Config } from './Config';
import { Reader } from './Reader';

@Service()
export class Client {
  constructor(private config: Config, private reader: Reader) {}

  connect() {
    const options = this.config.client;
    const client = net.createConnection(options);

    client.on('connect', () => {
      console.log('connected');
    });

    client.on('data', (data) => {
      const lines = data.toString().split('\n').filter(Boolean);
      lines.forEach((line) => this.reader.processLine(line, new Date()));
    });

    client.on('end', () => {
      console.log('disconnected');
      client.connect(options);
    });
  }
}
