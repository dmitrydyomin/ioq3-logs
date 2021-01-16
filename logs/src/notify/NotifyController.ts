import {
  ConnectedSocket,
  OnConnect,
  OnDisconnect,
  SocketController,
} from 'socket-controllers';
import { Socket } from 'socket.io';

import { Config } from '../Config';

enum EventType {
  Lamo = 1,
  Armor = 2,
  GameEnd = 2,
}

@SocketController('/notify')
export class NotifyController {
  private armorTimeout: NodeJS.Timeout | undefined;
  private sockets: Socket[] = [];

  constructor(private config: Config) {}

  @OnConnect()
  connect(@ConnectedSocket() socket: Socket) {
    this.sockets.push(socket);
  }

  @OnDisconnect()
  disconnect(@ConnectedSocket() socket: Socket) {
    this.sockets = this.sockets.filter((s) => s.id !== socket.id);
  }

  broadcast(eventType: EventType, isSound = true) {
    if (!isSound || this.config.sounds.enabled) {
      this.sockets.forEach((s) => s.emit('event', { type: eventType }));
    }
  }

  notifyArmor() {
    this.armorTimeout = setTimeout(() => {
      this.armorTimeout = undefined;
      this.broadcast(EventType.Armor);
    }, this.config.sounds.armorDelay);
  }

  cancelArmor() {
    if (this.armorTimeout !== undefined) {
      clearTimeout(this.armorTimeout);
      this.armorTimeout = undefined;
    }
  }

  notifyKill(playerId: number) {
    if (playerId === this.config.sounds.playerId) {
      this.broadcast(EventType.Lamo);
    }
  }

  notifyGameEnd() {
    this.broadcast(EventType.GameEnd, false);
  }
}
