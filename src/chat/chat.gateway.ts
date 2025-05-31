import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
    OnGatewayConnection,
    OnGatewayDisconnect
  } from '@nestjs/websockets';
  import { Server, Socket } from 'socket.io';
  
  @WebSocketGateway({ cors: true })
  export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;
  
    handleConnection(client: Socket) {
      console.log('Client connected:', client.id);
    }
  
    handleDisconnect(client: Socket) {
      console.log('Client disconnected:', client.id);
    }
  
    @SubscribeMessage('sendMessage')
    handleMessage(
      @MessageBody() data: { roomId: string; sender: string; message: string },
    ) {
      const messagePayload = {
        id: crypto.randomUUID(),
        content: data.message,
        senderId: data.sender,
        createdAt: new Date().toISOString(),
      };

      this.server.to(data.roomId).emit('receiveMessage', messagePayload);
    }
    
    @SubscribeMessage('joinRoom')
    handleJoinRoom(
      @MessageBody() data: { roomId: string },
      @ConnectedSocket() client: Socket,
    ) {
      client.join(data.roomId);
      console.log(`Client joined room: ${data.roomId}`);
    }
  }
  