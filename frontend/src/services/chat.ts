import { post } from './api';

export interface ChatResponse {
  response: string;
  suggestions?: string[];
  data?: any;
}

export async function sendChatMessage(message: string): Promise<{ data: ChatResponse }> {
  return post('/chat', { message }) as Promise<{ data: ChatResponse }>;
}
