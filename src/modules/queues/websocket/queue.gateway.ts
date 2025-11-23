import {
  WebSocketGateway as WSGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { Queue } from '../schemas/queue.schema';

@Injectable()
@WSGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
export class WebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedClients: Map<string, Socket> = new Map();

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    this.connectedClients.set(client.id, client);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  @SubscribeMessage('joinQueueRoom')
  handleJoinQueueRoom(client: Socket, data: { doctorId: string; queueDate: string }) {
    const room = `queue-${data.doctorId}-${data.queueDate}`;
    client.join(room);
    console.log(`Client ${client.id} joined room: ${room}`);
  }

  @SubscribeMessage('leaveQueueRoom')
  handleLeaveQueueRoom(client: Socket, data: { doctorId: string; queueDate: string }) {
    const room = `queue-${data.doctorId}-${data.queueDate}`;
    client.leave(room);
    console.log(`Client ${client.id} left room: ${room}`);
  }

  /**
   * Emit queue update to all connected clients
   */
  emitQueueUpdated(queue: Queue) {
    if (this.server) {
      const room = `queue-${queue.doctorId}-${new Date(queue.queueDate).toISOString().split('T')[0]}`;
      this.server.to(room).emit('queueUpdated', {
        event: 'queueUpdated',
        data: queue,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Emit queue list update for a specific doctor and date
   */
  emitQueueListUpdated(doctorId: string, queueDate: string) {
    if (this.server) {
      const room = `queue-${doctorId}-${queueDate}`;
      this.server.to(room).emit('queueListUpdated', {
        event: 'queueListUpdated',
        doctorId,
        queueDate,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Emit queue status change to all connected clients
   */
  emitQueueStatusChanged(queueId: string, status: string) {
    if (this.server) {
      this.server.emit('queueStatusChanged', {
        event: 'queueStatusChanged',
        queueId,
        status,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcastMessage(event: string, data: any) {
    if (this.server) {
      this.server.emit(event, {
        event,
        data,
        timestamp: new Date(),
      });
    }
  }
}
