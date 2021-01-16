import { Container, Service } from 'typedi';
import { createServer, Server as HttpServer } from 'http';
import { Server as Io } from 'socket.io';
import { useContainer, useExpressServer } from 'routing-controllers';
import {
  useContainer as useSocketContainer,
  useSocketServer,
} from 'socket-controllers';
import express from 'express';

import { Config } from './Config';
import { errorMiddleware } from './utils/errorMiddleware';
import { GameController } from './games/GameController';
import { NotifyController } from './notify/NotifyController';

@Service()
export class Server {
  private httpServer: HttpServer;

  constructor(private config: Config) {
    useContainer(Container);
    useSocketContainer(Container);

    const app = express();
    this.httpServer = createServer(app);
    const io = new Io(this.httpServer);

    useSocketServer(io, {
      controllers: [NotifyController],
    });

    useExpressServer(app, {
      controllers: [GameController],

      defaultErrorHandler: false,
    });

    app.use(errorMiddleware);
  }

  getHttpServer(): HttpServer {
    return this.httpServer;
  }

  listen() {
    this.httpServer.listen(this.config.app.port);
  }
}
