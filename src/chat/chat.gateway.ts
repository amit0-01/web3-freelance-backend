import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

@WebSocketGateway({ cors: { origin: '*', credentials: true } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private onlineUsers: Map<string, { socketId: string; lastActive: Date }> = new Map();

  constructor(private chatService: ChatService) {}

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      this.onlineUsers.set(userId, { socketId: client.id, lastActive: new Date() });
      this.server.emit('userOnline', { userId, status: 'online' });
    }
  }

  handleDisconnect(client: Socket) {
    const userId = Array.from(this.onlineUsers.entries()).find(
      ([, value]) => value.socketId === client.id,
    )?.[0];

    if (userId) {
      const lastActive = new Date();
      this.onlineUsers.set(userId, { socketId: '', lastActive });
      this.server.emit('userOffline', { userId, lastActive });
    }
  }

  @SubscribeMessage('getOnlineStatus')
  handleGetOnlineStatus(@MessageBody() data: { userId: string }, @ConnectedSocket() client: Socket) {
    const user = this.onlineUsers.get(data.userId);
    if (user && user.socketId) {
      client.emit('onlineStatus', { userId: data.userId, status: 'online' });
    } else {
      const lastActive = user?.lastActive || null;
      client.emit('onlineStatus', { userId: data.userId, status: 'offline', lastActive });
    }
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() data: { roomId: any; receiverId: number; senderId: number; message: string },
  ) {

    const savedMessage = await this.chatService.saveMessage({
      ...data,
      roomId: String(data.roomId),
      senderId: String(data.senderId),
      receiverId: String(data.receiverId),
    });

    const messagePayload = {
      id: Number(data.roomId),
      content: data.message,
      senderId: data.senderId,
      receiverId: data.receiverId,
      createdAt: new Date().toISOString(),
    };
    this.server.in(String(data.roomId)).emit('receiveMessage', messagePayload);
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.roomId);
    const messages = this.chatService.getMessagesByRoomId(data.roomId);
    messages.then((msgs) => {
      client.emit('chatHistory', msgs);
    });
  }

  @SubscribeMessage('typing')
  handleTyping(@MessageBody() data: { roomId?: string; jobId?: string; senderId: string }) {
    const roomId = data.roomId || data.jobId;
    if (!roomId) return;

    this.server.to(String(roomId)).emit('typing', {
      senderId: data.senderId,
    });
  }

  @SubscribeMessage('stopTyping')
  handleStopTyping(@MessageBody() data: { roomId: string; senderId: string }) {
    this.server.in(String(data.roomId)).emit('stopTyping', {
      senderId: data.senderId,
    });
  }

}
