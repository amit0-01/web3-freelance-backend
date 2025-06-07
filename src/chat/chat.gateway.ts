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
  
  @WebSocketGateway({ cors: { origin: '*', credentials: true } })
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
    @MessageBody() data: { roomId: any; receiverId: number; senderId: number; message: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log('Received message:', data);

    // Save the message to the database (uncomment and adjust as needed)
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
      console.log(data.roomId);
      client.join(data.roomId);
      console.log(`Client joined room: ${data.roomId}`);
      const messages = this.chatService.getMessagesByRoomId(data.roomId);
      messages.then(msgs => {
        client.emit('chatHistory', msgs);
      });
    }
  }  
