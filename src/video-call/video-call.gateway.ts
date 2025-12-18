import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Socket } from 'socket.io';

@WebSocketGateway()
export class VideoCallGateway {
  
  @WebSocketServer() server: Server;

  private userSocketMap = new Map<string, string>();

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string; 
    if (userId) {
      this.userSocketMap.set(userId, client.id);
      console.log(`✅ User ${userId} connected with socket ${client.id}`);
      console.log('Current userSocketMap:', this.userSocketMap);
    }
  }

  handleDisconnect(client: Socket) {
    for (const [userId, socketId] of this.userSocketMap.entries()) {
      if (socketId === client.id) {
        this.userSocketMap.delete(userId);
        console.log(`❌ User ${userId} disconnected`);
        break;
      }
    }
  }

  @SubscribeMessage('offer')
  handleOffer(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    const { to, sdp } = data;
    const toKey = String(to);
    const fromUserId = client.handshake.query.userId as string;
    
    console.log(`📞 Offer from ${fromUserId} to ${toKey}`);
    
    const receiverSocketId = this.userSocketMap.get(toKey);

    if (receiverSocketId) {
      this.server.to(receiverSocketId).emit('offer', {
        sdp,
        from: fromUserId,
      });
      console.log(`✅ Offer sent to ${toKey} (socket: ${receiverSocketId})`);
    } else {
      console.log(`❌ User ${toKey} not connected`);
    }
  }

  @SubscribeMessage('answer')
  handleAnswer(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    const { to, sdp } = data;
    const toKey = String(to);
    const fromUserId = client.handshake.query.userId as string;
    
    console.log(`📞 Answer from ${fromUserId} to ${toKey}`);
    
    const receiverSocketId = this.userSocketMap.get(toKey);
    
    if (receiverSocketId) {
      this.server.to(receiverSocketId).emit('answer', { 
        sdp, 
        from: fromUserId 
      });
      console.log(`✅ Answer sent to ${toKey} (socket: ${receiverSocketId})`);
    } else {
      console.log(`❌ User ${toKey} not connected`);
    }
  }

  @SubscribeMessage('ice-candidate')
  handleIceCandidate(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    const { to, candidate } = data; 
    const toKey = String(to);
    const fromUserId = client.handshake.query.userId as string;
    
    console.log(`🧊 ICE candidate from ${fromUserId} to ${toKey}`);
    
    const receiverSocketId = this.userSocketMap.get(toKey);
    
    if (receiverSocketId) {
      this.server.to(receiverSocketId).emit('ice-candidate', { 
        candidate, 
        from: fromUserId 
      });
      console.log(`✅ ICE candidate sent to ${toKey}`);
    } else {
      console.log(`❌ User ${toKey} not connected`);
    }
  }
}