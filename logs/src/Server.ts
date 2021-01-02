import { Container, Service } from 'typedi';
import { createServer, Server as HttpServer } from 'http';
import { useContainer, useExpressServer } from 'routing-controllers';
import express from 'express';

import { Config } from './Config';
import { errorMiddleware } from './utils/errorMiddleware';
import { GameController } from './games/GameController';

@Service()
export class Server {
  private httpServer: HttpServer;

  constructor(private config: Config) {
    useContainer(Container);

    const app = express();
    this.httpServer = createServer(app);

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
