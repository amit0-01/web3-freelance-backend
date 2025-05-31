import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/databases/prisma.service";

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async saveMessage(data: {
    roomId: string;
    senderId: string;
    receiverId: string;
    message: string;
  }) {
    return this.prisma.chatMessage.create({
      data: {
        roomId: data.roomId,
        senderId: Number(data.senderId),
        receiverId: Number(data.receiverId),
        message: data.message,
      },
    });
  }

  async getMessages(roomId: string) {
    return this.prisma.chatMessage.findMany({
      where: { roomId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
