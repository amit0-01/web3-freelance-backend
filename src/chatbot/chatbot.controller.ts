import { Controller, Post, Body, UseGuards, Req, Get } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('message')
  async handleMessage(
    @Body('message') message: string,
    @Body('conversationId') conversationId?: string,
    @Body('userId') userId?: number,
  ) {
    try {
      if (!message || message.trim().length === 0) {
        return {
          statusCode: 400,
          status: 'error',
          message: 'Message cannot be empty',
          data: null,
        };
      }

      const response = await this.chatbotService.processMessage(
        message,
        userId,
        conversationId,
      );
      return {
        statusCode: 200,
        status: 'success',
        message: 'Message processed successfully',
        data: response,
      };
    } catch (error: any) {
      return {
        statusCode: 500,
        status: 'error',
        message: 'Failed to process message',
        error: error.message,
      };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('save-chat')
  async saveChatHistory(
    @Req() req,
    @Body('userMessage') userMessage: string,
    @Body('botResponse') botResponse: string,
    @Body('conversationId') conversationId: string,
  ) {
    try {
      if (!userMessage || !botResponse) {
        return {
          statusCode: 400,
          status: 'error',
          message: 'Both userMessage and botResponse are required',
          data: null,
        };
      }

      const userId = req.user.id;
      const result = await this.chatbotService.saveChatHistory(
        userId,
        userMessage,
        botResponse,
        conversationId,
      );
      return {
        statusCode: 200,
        status: 'success',
        message: 'Chat history saved successfully',
        data: result,
      };
    } catch (error: any) {
      return {
        statusCode: 500,
        status: 'error',
        message: 'Failed to save chat history',
        error: error.message,
      };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('history')
  async getChatHistory(@Req() req) {
    try {
      const userId = req.user.id;
      const history = await this.chatbotService.getChatHistory(userId);
      return {
        statusCode: 200,
        status: 'success',
        message: 'Chat history retrieved successfully',
        data: history,
      };
    } catch (error: any) {
      return {
        statusCode: 500,
        status: 'error',
        message: 'Failed to retrieve chat history',
        error: error.message,
      };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('clear-history')
  async clearChatHistory(@Req() req) {
    try {
      const userId = req.user.id;
      await this.chatbotService.clearChatHistory(userId);
      return {
        statusCode: 200,
        status: 'success',
        message: 'Chat history cleared successfully',
        data: null,
      };
    } catch (error: any) {
      return {
        statusCode: 500,
        status: 'error',
        message: 'Failed to clear chat history',
        error: error.message,
      };
    }
  }

  @Post('clear-conversation')
  async clearConversation(@Body('conversationId') conversationId: string) {
    try {
      if (!conversationId) {
        return {
          statusCode: 400,
          status: 'error',
          message: 'Conversation ID is required',
          data: null,
        };
      }

      await this.chatbotService.clearConversationContext(conversationId);
      return {
        statusCode: 200,
        status: 'success',
        message: 'Conversation cleared successfully',
        data: null,
      };
    } catch (error: any) {
      return {
        statusCode: 500,
        status: 'error',
        message: 'Failed to clear conversation',
        error: error.message,
      };
    }
  }
}