import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/databases/prisma.service";

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

    // SAVING MESSAGES TO DATABASE
  async saveMessage(data: {
    roomId: string;
    senderId: string;
    receiverId: string;
    message: string;
  }) {
    console.log('data',data )
    return this.prisma.chatMessage.create({
      data: {
        roomId: data.roomId,
        senderId: Number(data.senderId),
        receiverId: Number(data.receiverId),
        content: data.message,
      },
    });
  }

  async getMessages(roomId: string) {
    return this.prisma.chatMessage.findMany({
      where: { roomId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // GET MESSAGES BY ROOMID

  async getMessagesByRoomId(roomId: string | number) {
    return this.prisma.chatMessage.findMany({
      where: {
        roomId: String(roomId),
      },
      orderBy: {
        createdAt: "asc"
      }
    });
  }

  // GET FREELANCER FOR CLLIENT FOR CHAT
  async getFreelancersForClient(clientId: number) {
    // Step 1: Fetch all jobs by client with assigned freelancers and chat messages
    const jobs = await this.prisma.job.findMany({
      where: {
        employerId: clientId,
        freelancerId: { not: null },
      },
      include: {
        freelancer: true,
        chatMessages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  
    // Step 2: Group jobs by freelancer
    const freelancerMap = new Map<number, {
      freelancer: typeof jobs[number]['freelancer'],
      messages: typeof jobs[number]['chatMessages'],
      jobs: { id: number, title: string }[],
    }>();
  
    for (const job of jobs) {
      const existing = freelancerMap.get(job.freelancer.id);
      if (existing) {
        existing.messages.push(...job.chatMessages);
        existing.jobs.push({ id: job.id, title: job.title });
      } else {
        freelancerMap.set(job.freelancer.id, {
          freelancer: job.freelancer,
          messages: [...job.chatMessages],
          jobs: [{ id: job.id, title: job.title }],
        });
      }
    }
  
    // Step 3: Construct the conversation-style response
    const conversations = Array.from(freelancerMap.values()).map(data => {
      const sortedMessages = data.messages.sort((a, b) =>
        a.createdAt.getTime() - b.createdAt.getTime()
      );
      const lastMessage = sortedMessages[sortedMessages.length - 1] || null;
  
      return {
        id: data.freelancer.id, // unique per freelancer
        participant: {
          id: data.freelancer.id,
          name: data.freelancer.name,
          avatar: null,
        },
        jobIds: data.jobs.map(j => j.id),
        jobTitles: data.jobs.map(j => j.title),
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              content: lastMessage.content,
              senderId: lastMessage.senderId,
              createdAt: lastMessage.createdAt,
            }
          : null,
        unreadCount: 0, // Add actual logic if you track read status
        updatedAt: lastMessage?.createdAt || null,
        messages: sortedMessages.map(msg => ({
          id: msg.id,
          content: msg.content,
          senderId: msg.senderId,
          createdAt: msg.createdAt,
        })),
      };
    });
  
    return conversations;
  }

  // GET CLIENT FOR FREELANCER FOR CHAT

  async getClientForFreelancer(freelancerId: number) {
    const jobs = await this.prisma.job.findMany({
      where: {
        freelancerId,
        // NOT: [{ employerId: null }],
      },
      include: {
        employer: true,
        chatMessages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

  
    const clientMap = new Map<number, {
      client: typeof jobs[number]['employer'],
      messages: typeof jobs[number]['chatMessages'],
      jobs: { id: number, title: string }[],
    }>();
  
    for (const job of jobs) {
      const clientId = job.employer.id;
      const existing = clientMap.get(clientId);
  
      if (existing) {
        existing.messages.push(...job.chatMessages);
        existing.jobs.push({ id: job.id, title: job.title });
      } else {
        clientMap.set(clientId, {
          client: job.employer,
          messages: [...job.chatMessages],
          jobs: [{ id: job.id, title: job.title }],
        });
      }
    }
  
    const conversations = Array.from(clientMap.values()).map(data => {
      const sortedMessages = data.messages.sort((a, b) =>
        a.createdAt.getTime() - b.createdAt.getTime()
      );
      const lastMessage = sortedMessages[sortedMessages.length - 1] || null;
  
      return {
        id: data.client.id,
        participant: {
          id: data.client.id,
          name: data.client.name,
          avatar: null,
        },
        jobIds: data.jobs.map(j => `job-${j.id}`),
        jobTitles: data.jobs.map(j => j.title),
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              content: lastMessage.content,
              senderId: lastMessage.senderId,
              createdAt: lastMessage.createdAt,
            }
          : null,
        unreadCount: 0,
        updatedAt: lastMessage?.createdAt || null,
        messages: sortedMessages.map(msg => ({
          id: msg.id,
          content: msg.content,
          senderId: msg.senderId,
          createdAt: msg.createdAt,
        })),
      };
    });
  
    return conversations;
  }
  
}
