export interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  emotion?: string;
  sessionId: string;
}

export interface MoodEntry {
  id: number;
  mood: string;
  intensity: number;
  timestamp: string;
  note?: string;
  emotions?: string[];
  tags?: string[];
  sessionId: string;
}
