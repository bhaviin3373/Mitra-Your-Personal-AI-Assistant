
export enum Role {
  USER = 'user',
  MODEL = 'model',
}

export interface Message {
  id: number;
  role: Role;
  content: string;
  suggestions?: string[];
  image?: string; // data URL for the image
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
}

export interface Theme {
  name: string;
  colors: {
    '--primary-400': string;
    '--primary-500': string;
    '--primary-600': string;
  };
}