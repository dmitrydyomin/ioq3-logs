import 'reflect-metadata';

import { Container } from 'typedi';

import { Client } from './Client';
import { Config } from './Config';
import { Server } from './Server';

if (Container.get(Config).client.enabled) {
  Container.get(Client).connect();
}

Container.get(Server).listen();
