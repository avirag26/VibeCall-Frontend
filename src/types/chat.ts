export type Gender = 'male' | 'female' | 'random' | '';
export type Country = string;

export interface CombinedFilters {
  myGender: Gender;
  myCountry: Country;
  targetGender: Gender;
  targetCountry: Country;
}

export interface ConnectionStatus {
  status: 'disconnected' | 'connecting' | 'waiting' | 'connected';
  message: string;
}

export interface ChatMessage {
  text: string;
  senderId: string;
  timestamp: string;
  isOwn?: boolean;
}