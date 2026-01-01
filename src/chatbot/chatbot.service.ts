import { Injectable } from '@nestjs/common';
import { PrismaService } from '../databases/prisma.service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSystemPrompt } from '../core/utils/chatbot.utils';
import { ConversationContext } from 'src/core/utils/utils';

@Injectable()
export class ChatbotService {
  private conversationContexts = new Map<string, ConversationContext>();

  private genAI: GoogleGenerativeAI;

  constructor(private prisma: PrismaService) {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY is not configured in environment variables');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async processMessage(
  message: string,
  userId?: number,
  conversationId?: string,
): Promise<{ response: string; conversationId: string }> {

  if (!message) {
    return { response: 'Please provide a message.', conversationId: '' };
  }
  try {
    const convId = conversationId || `conv_${Date.now()}_${Math.random()}`;
    const systemPrompt = getSystemPrompt();
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
    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });  
    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: systemPrompt }],
        },
        {
          role: 'model',
          parts: [{ text: 'I understand and will act as a helpful assistant for the freelance platform.' }],
        },
        ...messagesToSend.flatMap(msg => [
          {
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
          },
        ]),
      ],
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
        topP: 0.9,
      },
    });
    let assistantResponse: string;
    try {
      const result = await chat.sendMessage(message);
      assistantResponse = await result.response.text();
    } catch (error: any) {
      console.error('Gemini API Error:', error);
      throw new Error(`Failed to get response from Gemini: ${error.message}`);
    }
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
    console.error('Error calling Gemini API:', error.message);
    return {
      response:
        'Sorry, I am unable to process your request at the moment. Please try again later.',
      conversationId: conversationId || '',
    };
  }
}


  async saveChatHistory(
    userId: number,
    userMessage: string,
    botResponse: string,
    conversationId: string,
  ): Promise<any> {
    try {
      const chatHistory = await this.prisma.chatbotMessage.create({
        data: {
          userId,
          message: userMessage,
          response: botResponse,
          conversationId,
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
      const history = await this.prisma.chatbotMessage.findMany({
        where: { userId },
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