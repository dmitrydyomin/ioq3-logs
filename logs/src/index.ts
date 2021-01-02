import 'reflect-metadata';
import { Container } from 'typedi';

import { Client } from './Client';

Container.get(Client).connect();
