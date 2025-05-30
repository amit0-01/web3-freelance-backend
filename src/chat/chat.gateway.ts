import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from "@nestjs/websockets";
import { Socket } from "socket.io";
import { Server } from "socket.io";

// chat.gateway.ts
@WebSocketGateway({ cors: true })
export class ChatGateway {
  @WebSocketServer() server: Server;

  // Called when a client connects
  handleConnection(client: any) {
    console.log('Client connected:', client.id);
  }

  // Called when a client disconnects
  handleDisconnect(client: any) {
    console.log('Client disconnected:', client.id);
  }

  // Handle messages sent between users
  @SubscribeMessage('sendMessage')
  handleMessage(
    @MessageBody() data: { roomId: string; sender: string; message: string },
  ) {
    this.server.to(data.roomId).emit('receiveMessage', data);
  }

  // Join chat room
  @SubscribeMessage('joinRoom')
  handleJoinRoom(@MessageBody() data: { roomId: string }, @ConnectedSocket() client: Socket) {
    client.join(data.roomId);
  }
}
