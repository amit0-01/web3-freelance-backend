export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
  }
  
export interface ConversationContext {
    userId: number;
    conversationId: string;
    messages: Message[];
    context: string;
  }