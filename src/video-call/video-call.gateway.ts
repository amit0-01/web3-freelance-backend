import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { from } from 'form-data';
import { Server } from 'socket.io';
import { Socket } from 'socket.io';


@WebSocketGateway()
export class VideoCallGateway {
  
  @WebSocketServer() server : Server;

  @SubscribeMessage('offer')
  handleOffer(@MessageBody() data:any, @ConnectedSocket() client : Socket){
    this.server.to(data.to).emit('offer', {sdp : data.sdp, from : client.id});
  }

  @SubscribeMessage('answer')
  handleAnswer(@MessageBody() data:any, @ConnectedSocket() client : Socket){
   this.server.to(data.to).emit('answer', {sdp : data.sdp, from : client.id});
  }

  @SubscribeMessage('ice-candidate')
  handleIceCandidate(@MessageBody() data:any, @ConnectedSocket() client : Socket){
    this.server.to(data.to).emit('ice-candidate', {candidate : data.candiate, from : client.id});
  }
}
