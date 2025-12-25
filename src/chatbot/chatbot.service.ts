import { Injectable } from '@nestjs/common';
import { PrismaService } from '../databases/prisma.service';
import axios from 'axios';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ConversationContext {
  userId: number;
  conversationId: string;
  messages: Message[];
  context: string;
}

@Injectable()
export class ChatbotService {
  private conversationContexts = new Map<string, ConversationContext>();

  constructor(private prisma: PrismaService) {}

  async processMessage(
    message: string,
    userId?: number,
    conversationId?: string,
  ): Promise<{ response: string; conversationId: string }> {
    if (!message) {
      return { response: 'Please provide a message.', conversationId: '' };
    }

    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not configured');
      }

      const convId = conversationId || `conv_${Date.now()}_${Math.random()}`;
      const systemPrompt = this.getSystemPrompt();

      let context = this.conversationContexts.get(convId);
      if (!context) {
        context = {
          userId: userId || 0,
          conversationId: convId,
          messages: [],
          context: 'freelance_platform_assistant',
        };
        this.conversationContexts.set(convId, context);
      }

      context.messages.push({
        role: 'user',
        content: message,
      });

      const messagesToSend = context.messages.slice(-10);

      const apiUrl = 'https://api.openai.com/v1/chat/completions';

      const response = await axios.post(
        apiUrl,
        {
          model: 'gpt-4',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messagesToSend,
          ],
          max_tokens: 500,
          temperature: 0.7,
          top_p: 0.9,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
        },
      );

      const assistantResponse = response.data.choices[0].message.content;

      context.messages.push({
        role: 'assistant',
        content: assistantResponse,
      });

      if (userId) {
        await this.saveChatHistory(userId, message, assistantResponse, convId);
      }

      return {
        response: assistantResponse,
        conversationId: convId,
      };
    } catch (error: any) {
      console.error('Error calling ChatGPT API:', error.response?.data || error.message);
      return {
        response:
          'Sorry, I am unable to process your request at the moment. Please try again later.',
        conversationId: conversationId || '',
      };
    }
  }

  private getSystemPrompt(): string {
    return `You are an intelligent AI Assistant for a Web3 Freelance Platform. Your role is to help users with:

1. **Job Management**: Help users post jobs, search for freelancers, manage contracts
2. **Freelancer Services**: Assist freelancers in finding jobs, managing proposals, tracking payments
3. **Web3 & Blockchain**: Explain smart contracts, wallet connections, crypto payments, NFTs
4. **Platform Features**: Guide users through platform features, account setup, profile optimization
5. **Payment & Escrow**: Explain payment processes, escrow mechanisms, dispute resolution
6. **Best Practices**: Provide advice on pricing, communication, project management

Guidelines:
- Be professional, friendly, and helpful
- Provide concise but comprehensive answers
- When users ask about features, explain clearly how to use them
- For technical Web3 questions, break down complex concepts
- Always encourage users to read documentation for detailed info
- If unsure about something, admit it and suggest contacting support
- Maintain context across the conversation for better assistance
- Suggest relevant platform features when appropriate

Current Platform Context:
- Users can post jobs with crypto payments
- Freelancers can apply to jobs and receive payments via Razorpay
- Smart contracts handle escrow and payment release
- Users have roles: EMPLOYER, FREELANCER, or ADMIN`;
  }

  async saveChatHistory(
    userId: number,
    userMessage: string,
    botResponse: string,
    conversationId: string,
  ): Promise<any> {
    try {
      const chatHistory = await this.prisma.chatMessage.create({
        data: {
          senderId: userId,
          receiverId: 1, // Bot user ID (create a bot user or use 1)
          content: userMessage,
          roomId: conversationId,
        },
      });
      return chatHistory;
    } catch (error) {
      console.error('Error saving chat history:', error);
      throw new Error('Failed to save chat history');
    }
  }
  
  async getChatHistory(userId: number): Promise<any[]> {
    try {
      const history = await this.prisma.chatMessage.findMany({
        where: { senderId: userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return history;
    } catch (error) {
      console.error('Error retrieving chat history:', error);
      throw new Error('Failed to retrieve chat history');
    }
  }
  
  async clearChatHistory(userId: number): Promise<void> {
    try {
      await this.prisma.chatMessage.deleteMany({
        where: { senderId: userId },
      });
    } catch (error) {
      console.error('Error clearing chat history:', error);
      throw new Error('Failed to clear chat history');
    }
  }

  async clearConversationContext(conversationId: string): Promise<void> {
    this.conversationContexts.delete(conversationId);
  }

  getConversationContext(conversationId: string): ConversationContext | undefined {
    return this.conversationContexts.get(conversationId);
  }
}