// frontend/src/services/apiService.ts

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface ChatResponse {
  message: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  timestamp: string;
}

interface AuthResponse {
  message: string;
  token: string;
  user: {
    id: number;
    email: string;
    full_name?: string;
  };
}

// Unified Session Interfaces
export interface UnifiedSession {
  id: number;
  session_id: string;
  user_id: number | null;
  is_guest: boolean;
  started_at: string;
  message_count: number;
  mood_entry_count: number;
  mood_entries: {
    id: number;
    mood: string;
    intensity: number;
    note: string;
    emotions: string[];
    tags: string[];
    created_at: string;
    session_id_string?: string;
  }[];
  last_message_preview: string;
}

export interface UnifiedSessionsResponse {
  sessions: UnifiedSession[];
  count: number;
}

// Legacy interfaces (for backward compatibility)
interface SessionData {
  id: number;
  session_id: string;
  user_id: number | null;
  is_guest: boolean;
  started_at: string;
  message_count: number;
}

interface SessionsResponse {
  sessions: SessionData[];
  count: number;
}

const getAuthToken = (): string | null => {
  return localStorage.getItem('calmi_token');
};

const getHeaders = (includeAuth: boolean = false) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (includeAuth) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  return headers;
};

// CHAT FUNCTIONS
export const sendChatMessage = async (
  sessionId: string,
  message: string
): Promise<ChatResponse> => {
  try {
    console.log('🔵 Sending message to backend:', {
      url: `${API_BASE_URL}/api/chat/send`,
      sessionId,
      message
    });

    const response = await fetch(`${API_BASE_URL}/api/chat/send`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({
        session_id: sessionId,
        message: message,
      }),
    });

    console.log('🔵 Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('API error:', errorData);
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ API response data:', data);

    return {
      message: data.message || data.response || 'I understand. Tell me more.',
      sentiment: data.sentiment || 'neutral',
      timestamp: new Date().toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
    };
  } catch (error) {
    console.error('Error in sendChatMessage:', error);
    throw error;
  }
};

export const getChatHistory = async (sessionId: number): Promise<any> => {
  try {
    console.log('💬 Fetching chat history for session:', sessionId);
    
    const response = await fetch(`${API_BASE_URL}/api/chat/history/${sessionId}`, {
      method: 'GET',
      headers: getHeaders(true),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch history: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching chat history:', error);
    throw error;
  }
};

// UNIFIED SESSIONS FUNCTION (NEW)
export const getUnifiedSessions = async (): Promise<UnifiedSessionsResponse> => {
  try {
    console.log('Fetching unified sessions');
    
    const response = await fetch(`${API_BASE_URL}/api/chat/unified-sessions`, {
      method: 'GET',
      headers: getHeaders(true),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch unified sessions: ${response.status}`);
    }

    const data: UnifiedSessionsResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching unified sessions:', error);
    throw error;
  }
};

// SESSION STATISTICS (NEW)
export const getSessionStatistics = async (): Promise<any> => {
  try {
    console.log('📊 Fetching session statistics');
    
    const response = await fetch(`${API_BASE_URL}/api/chat/statistics`, {
      method: 'GET',
      headers: getHeaders(true),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch session statistics: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Error fetching session statistics:', error);
    throw error;
  }
};

// Legacy session function (kept for backward compatibility)
export const getUserSessions = async (): Promise<SessionsResponse> => {
  try {
    console.log('📚 Fetching user chat sessions (legacy)');
    
    const response = await fetch(`${API_BASE_URL}/api/chat/sessions`, {
      method: 'GET',
      headers: getHeaders(true),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch sessions: ${response.status}`);
    }

    const data: SessionsResponse = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Error fetching sessions:', error);
    throw error;
  }
};

// MOOD FUNCTIONS
export const getMoodHistory = async (sessionId: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/mood/${sessionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching mood history:', error);
    throw error;
  }
};

// frontend/src/services/apiService.ts

// Remove the complex update logic - just create new entries
export const submitMoodCheckIn = async (
  sessionId: string,
  mood: string,
  intensity: number,
  note?: string,
  emotions?: string[],
  tags?: string[]
): Promise<{ message: string; mood_entry: any; recommendation?: string }> => {
  const token = localStorage.getItem('calmi_token');
  
  const payload: any = {
    session_id: sessionId,
    mood: mood,
    intensity: intensity
  };
  
  if (note && note.trim()) {
    payload.note = note.trim();
  }
  
  if (emotions && emotions.length > 0) {
    payload.emotions = emotions;
  }
  
  if (tags && tags.length > 0) {
    payload.tags = tags;
  }
  
  console.log('📤 Creating new mood check-in:', payload);
  
  const response = await fetch(`${API_BASE_URL}/api/mood/check-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('❌ Mood check-in failed:', errorData);
    throw new Error(errorData.error || 'Failed to submit mood check-in');
  }

  const data = await response.json();
  console.log('✅ Mood check-in successful with recommendation:', data);
  return data;
};

// Add these new interfaces and functions at the end of apiService.ts

export interface MoodStatistics {
  total_check_ins: number;
  mood_distribution: Record<string, number>;
  average_intensity: number;
  common_emotions?: string[];
  emotion_distribution?: Record<string, number>;
  time_period?: string;
}

export interface AnalyticsRecommendation {
  recommendation: string;
  generated_at: string;
}

export const getAnalyticsRecommendation = async (
  moodStatistics: MoodStatistics
): Promise<AnalyticsRecommendation> => {
  try {
    console.log('🤖 Requesting analytics recommendation');
    
    const response = await fetch(`${API_BASE_URL}/api/mood/analytics/recommendation`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({
        mood_statistics: moodStatistics
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to get analytics recommendation');
    }

    const data = await response.json();
    console.log('✅ Analytics recommendation received');
    return data;
  } catch (error) {
    console.error('❌ Error fetching analytics recommendation:', error);
    throw error;
  }
};

export const getMoodStatistics = async (days: number = 30): Promise<{ statistics: MoodStatistics }> => {
  try {
    console.log('📊 Fetching mood statistics for', days, 'days');
    
    const response = await fetch(`${API_BASE_URL}/api/mood/statistics?days=${days}`, {
      method: 'GET',
      headers: getHeaders(true),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch mood statistics: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching mood statistics:', error);
    throw error;
  }
};

// Optional: Keep update function if you want to allow editing specific entries
export const updateMoodCheckIn = async (
  entryId: number,
  mood: string,
  intensity: number,
  note?: string,
  emotions?: string[],
  tags?: string[]
): Promise<{ message: string; mood_entry: any }> => {
  const token = localStorage.getItem('calmi_token');
  if (!token) {
    throw new Error('Authentication required to update mood entries');
  }
  
  const payload: any = {
    mood: mood,
    intensity: intensity
  };
  
  if (note !== undefined) {
    payload.note = note.trim();
  }
  
  if (emotions !== undefined) {
    payload.emotions = emotions;
  }
  
  if (tags !== undefined) {
    payload.tags = tags;
  }
  
  console.log('📝 Updating mood entry:', entryId);
  
  const response = await fetch(`${API_BASE_URL}/api/mood/entry/${entryId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('❌ Mood update failed:', errorData);
    throw new Error(errorData.error || 'Failed to update mood check-in');
  }

  const data = await response.json();
  console.log('✅ Mood update successful:', data);
  return data;
};

// Function to get ALL mood entries for a session (not just the latest)
export const getSessionMoodEntries = async (sessionId: string): Promise<any> => {
  try {
    console.log('🔍 Fetching all mood entries for session:', sessionId);
    
    const response = await fetch(`${API_BASE_URL}/api/mood/session/${sessionId}/entries`, {
      method: 'GET',
      headers: getHeaders(true),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch session mood entries: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching session mood entries:', error);
    throw error;
  }
};

export const getUserMoodHistory = async (): Promise<any> => {
  try {
    console.log('📊 Fetching user mood history');
    
    const response = await fetch(`${API_BASE_URL}/api/mood/user/history`, {
      method: 'GET',
      headers: getHeaders(true), 
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch mood history: ${response.status}`);
    }

    const data = await response.json();
    console.log('Mood history fetched:', data);
    return data;
  } catch (error) {
    console.error('❌ Error fetching mood history:', error);
    throw error;
  }
};

// AUTHENTICATION FUNCTIONS
export const registerUser = async (email: string, password: string, fullName: string = ''): Promise<AuthResponse> => {
  try {
    console.log('📝 Registering user:', email);
    
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        email,
        password,
        full_name: fullName,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Registration failed: ${response.status}`);
    }

    const data: AuthResponse = await response.json();
    
    // Store token and user info
    localStorage.setItem('calmi_token', data.token);
    localStorage.setItem('calmi_user', JSON.stringify(data.user));
    
    return data;
  } catch (error) {
    console.error('❌ Registration error:', error);
    throw error;
  }
};

export const loginUser = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    console.log('🔐 Logging in user:', email);
    
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        email,
        password,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Login failed: ${response.status}`);
    }

    const data: AuthResponse = await response.json();
    
    // Store token and user info
    localStorage.setItem('calmi_token', data.token);
    localStorage.setItem('calmi_user', JSON.stringify(data.user));
    
    return data;
  } catch (error) {
    console.error('❌ Login error:', error);
    throw error;
  }
};

export const verifyToken = async (): Promise<boolean> => {
  try {
    const token = getAuthToken();
    if (!token) return false;
    
    const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
      method: 'GET',
      headers: getHeaders(true),
    });

    return response.ok;
  } catch (error) {
    console.error('Token verification failed:', error);
    return false;
  }
};

export const logoutUser = (): void => {
  localStorage.removeItem('calmi_token');
  localStorage.removeItem('calmi_user');
};

// DELETE SESSION FUNCTION
export const deleteSession = async (sessionId: number): Promise<{ success: boolean; message: string; session_id?: number }> => {
  try {
    const token = getAuthToken();
    console.log('🗑️ Deleting session:', sessionId, 'with token:', token ? 'Present' : 'Missing');
    
    const response = await fetch(`${API_BASE_URL}/api/chat/session/${sessionId}`, {
      method: 'DELETE',
      headers: getHeaders(true),
    });

    console.log('🔵 Delete response status:', response.status);
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: `HTTP error! status: ${response.status}` };
      }
      
      const errorMessage = errorData?.error || `Failed to delete session: ${response.status}`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('✅ Delete successful:', data);
    
    if (!data.success) {
      throw new Error(data.error || 'Delete failed');
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error in deleteSession:', error);
    throw error;
  }
};

// Optional: Add a create session function if needed
export const createSession = async (sessionId: string): Promise<any> => {
  try {
    console.log('➕ Creating new session:', sessionId);
    
    const response = await fetch(`${API_BASE_URL}/api/chat/session`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({
        session_id: sessionId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Session created:', data);
    return data;
  } catch (error) {
    console.error('❌ Error creating session:', error);
    throw error;
  }
};
