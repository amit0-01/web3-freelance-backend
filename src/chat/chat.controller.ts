import { Controller, ForbiddenException, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Request } from 'express';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @UseGuards(JwtAuthGuard)
  @Get('getUsers')
  @UseGuards(JwtAuthGuard)
  @Get('getUsers')
  async getUsers(@Req() req: Request) {
    const user = req.user as any;
  
    if (user.role === 'CLIENT') {
      const clientId = user.id;
      return this.chatService.getFreelancersForClient(clientId);
    } else if (user.role === 'FREELANCER') {
      const freelancerId = user.id;
      return this.chatService.getClientForFreelancer(freelancerId);
    }
  
    throw new ForbiddenException('Access denied');
  }  
}
