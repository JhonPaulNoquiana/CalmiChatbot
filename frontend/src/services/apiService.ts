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
  mood_entry: {
    id: number;
    mood: string;
    intensity: number;
    note: string;
    emotions: string[];
    tags: string[];
    created_at: string;
    session_id_string?: string;
  } | null;
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

export const submitMoodCheckIn = async (
  sessionId: string,
  mood: string,
  intensity: number,
  note: string = '',
  emotions: string[] = [],
  tags: string[] = []
) => {
  try {
    console.log('📝 Submitting mood check-in:', { sessionId, mood, intensity, note });
    
    const response = await fetch(`${API_BASE_URL}/api/mood/check-in`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({
        session_id: sessionId,
        mood,
        intensity,
        note,
        emotions,
        tags
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Mood check-in error:', errorData);
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Mood check-in saved:', data);
    return data;
  } catch (error) {
    console.error('❌ Error submitting mood check-in:', error);
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