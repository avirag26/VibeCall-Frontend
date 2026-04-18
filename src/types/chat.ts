export interface ConnectionStatus {
  status: 'disconnected' | 'waiting' | 'connected' | 'connecting';
  message: string;
}

export interface ChatMessage {
  text: string;
  senderId: string;
  timestamp: string;
  isOwn: boolean;
}
