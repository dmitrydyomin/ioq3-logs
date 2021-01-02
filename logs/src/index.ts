import 'reflect-metadata';
import { Container } from 'typedi';

import { Client } from './Client';
import { Server } from './Server';

Container.get(Client).connect();
Container.get(Server).listen();
