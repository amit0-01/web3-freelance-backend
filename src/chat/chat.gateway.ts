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
import { ChatService } from './chat.service';
  
  @WebSocketGateway({ cors: true })
  export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(private chatService : ChatService){}
  
    handleConnection(client: Socket) {
      console.log('Client connected:', client.id);
    }
  
    handleDisconnect(client: Socket) {
      console.log('Client disconnected:', client.id);
    }
  
    @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody()
    data: { roomId: string; receiverId: number;  senderId: number; message: string },
  ) {
    console.log('data', data)
    const savedMessage = await this.chatService.saveMessage({
      ...data,
      roomId: String(data.roomId),
      senderId: String(data.senderId),
      receiverId: String(data.receiverId),
    });

    this.server.to(String(data.roomId)).emit('receiveMessage', {
      id: savedMessage.id,
      content: savedMessage.content,
      senderId: savedMessage.senderId,
      receiverId: savedMessage.receiverId,
      createdAt: savedMessage.createdAt,
    });
  }

    
    @SubscribeMessage('joinRoom')
    handleJoinRoom(
      @MessageBody() data: { roomId: string },
      @ConnectedSocket() client: Socket,
    ) {
      client.join(data.roomId);
      console.log(`Client joined room: ${data.roomId}`);
      const messages = this.chatService.getMessagesByRoomId(data.roomId);
      messages.then(msgs => {
        client.emit('chatHistory', msgs);
      });
    }
  }  
