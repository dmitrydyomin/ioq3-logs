import express from 'express';
import { createServer, Server as HttpServer } from 'http';
import { useContainer, useExpressServer } from 'routing-controllers';
import { SocketControllers } from 'socket-controllers';
import { Server as Io } from 'socket.io';
import { Container, Service } from 'typedi';

import { Config } from './Config';
import { GameController } from './games/GameController';
import { NotifyController } from './notify/NotifyController';
import { errorMiddleware } from './utils/errorMiddleware';

@Service()
export class Server {
  private httpServer;

  constructor(private config: Config) {
    useContainer(Container);

    const app = express();
    this.httpServer = createServer(app);
    const io = new Io(this.httpServer);

    new SocketControllers({
      io,
      container: Container,
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
