import { useState, useEffect } from 'react';
import type { Message } from '../types';
import { Sparkles, Loader2, Heart } from 'lucide-react';
import { getAnalyticsRecommendation, type MoodStatistics } from '../services/apiService';

import { 
  History as HistoryIcon, 
  MessageSquare, 
  X, 
  Trash2, 
  Calendar, 
  BarChart,
  Smile,
  Clock
} from 'lucide-react';
import { 
  getUnifiedSessions, 
  getChatHistory, 
  deleteSession, 
  type UnifiedSession 
} from '../services/apiService';

interface HistoryProps {
  getMoodEmoji: (mood: string) => string;
  isAuthenticated?: boolean;
  isGuest?: boolean;
  onOpenPreviousChat?: (messages: Message[]) => void;
  onShowLogin?: () => void;
}

interface ChatMessage {
  id: number;
  session_id: number;
  user_id: number | null;
  sender: string;
  text: string;
  sentiment: string;
  created_at: string;
}

export default function History({ 
  getMoodEmoji, 
  isAuthenticated, 
  isGuest, 
  onOpenPreviousChat, 
  onShowLogin 
}: HistoryProps) {
  const [sessions, setSessions] = useState<UnifiedSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionMessages, setSessionMessages] = useState<Record<number, ChatMessage[]>>({});
  const [selectedSessionChat, setSelectedSessionChat] = useState<UnifiedSession | null>(null);
  const [loadingChat, setLoadingChat] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<'sessions' | 'analytics'>('sessions');
  const [loadingMoodEntries, setLoadingMoodEntries] = useState<Record<number, boolean>>({});
  const [analyticsRecommendation, setAnalyticsRecommendation] = useState<string>('');
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);
  const [showRecommendation, setShowRecommendation] = useState(false);

  useEffect(() => {
    if (activeView === 'analytics') {
      loadAllMoodEntries();
    }
  }, [activeView]);

  // Add this function to load mood entries for all sessions
  const loadAllMoodEntries = async () => {
    // Only load for sessions that have mood entries but haven't been loaded
    const sessionsToLoad = sessions.filter(
      session => session.mood_entry_count > 0 && 
      (!session.mood_entries || session.mood_entries.length === 0)
    );
    
    if (sessionsToLoad.length === 0) return;
    
    console.log('📊 Loading mood entries for analytics...');
    
    // Load mood entries for each session
    for (const session of sessionsToLoad) {
      await loadSessionMoodEntries(session.id, session.session_id);
    }
  };

  // Load unified sessions for authenticated users
  useEffect(() => {
    if (isAuthenticated && !isGuest) {
      loadUnifiedSessions();
    }
  }, [isAuthenticated, isGuest]);

  const loadUnifiedSessions = async () => {
    try {
      setLoadingSessions(true);
      const data = await getUnifiedSessions();
      console.log('📊 Loaded unified sessions:', data);
      console.log('📊 Session count:', data.sessions.length);
      
      // Debug each session
      data.sessions.forEach((session: UnifiedSession, index: number) => {
        console.log(`Session ${index + 1}:`, {
          id: session.id,
          mood_entry_count: session.mood_entry_count,
          has_mood_entries: !!session.mood_entries,
          mood_entries_length: session.mood_entries?.length || 0,
          mood_entries: session.mood_entries
        });
      });
      
      setSessions(data.sessions);
    } catch (error) {
      console.error('Failed to load unified sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadSessionMoodEntries = async (sessionId: number, sessionUUID?: string) => {
    try {
      setLoadingMoodEntries(prev => ({ ...prev, [sessionId]: true }));
      
      let endpoint = '';
      const flaskBaseUrl = 'http://localhost:5000'; // Your Flask URL
      
      // If we have a UUID, use it, otherwise use numeric ID
      if (sessionUUID) {
        endpoint = `${flaskBaseUrl}/api/mood/session/${sessionUUID}/entries`;
      } else {
        // Try numeric endpoint or get UUID from sessions array
        const session = sessions.find(s => s.id === sessionId);
        if (session?.session_id) {
          endpoint = `${flaskBaseUrl}/api/mood/session/${session.session_id}/entries`;
        } else {
          endpoint = `${flaskBaseUrl}/api/mood/session/numeric/${sessionId}/entries`;
        }
      }
      
      console.log('📊 Fetching mood entries from:', endpoint);
      
      const response = await fetch(endpoint, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies if needed
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      console.log('📊 Loaded mood entries:', data);
      
      if (data.mood_entries && data.mood_entries.length > 0) {
        // Update the session with mood entries
        setSessions(prev => prev.map(s => 
          s.id === sessionId 
            ? { ...s, mood_entries: data.mood_entries }
            : s
        ));
        
        // Also update selected session if it's open
        if (selectedSessionChat?.id === sessionId) {
          setSelectedSessionChat(prev => 
            prev ? { ...prev, mood_entries: data.mood_entries } : null
          );
        }
      }
    } catch (error) {
      console.error('Failed to load mood entries:', error);
    } finally {
      setLoadingMoodEntries(prev => ({ ...prev, [sessionId]: false }));
    }
  };

  const loadSessionMessages = async (sessionId: number) => {
    if (sessionMessages[sessionId]) return;
    try {
      setLoadingChat(true);
      const data = await getChatHistory(sessionId);
      setSessionMessages(prev => ({
        ...prev,
        [sessionId]: data.messages
      }));
    } catch (error) {
      console.error('Failed to load session messages:', error);
    } finally {
      setLoadingChat(false);
    }
  };

  const handleDeleteSession = async (sessionId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setDeletingSessionId(sessionId);
      console.log('🗑️ Deleting session:', sessionId);
      
      await deleteSession(sessionId);
      
      console.log('✅ Delete successful');
      
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      setSessionMessages(prev => {
        const newMessages = { ...prev };
        delete newMessages[sessionId];
        return newMessages;
      });
      setShowDeleteConfirm(null);
      
      if (selectedSessionChat?.id === sessionId) {
        setSelectedSessionChat(null);
      }
      
    } catch (error) {
      console.error('❌ Failed to delete session:', error);
      alert(`Failed to delete chat session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDeletingSessionId(null);
    }
  };

  const openChatSession = async (session: UnifiedSession) => {
    setSelectedSessionChat(session);
    
    // Load mood entries if they exist but aren't loaded
    if (session.mood_entry_count > 0 && (!session.mood_entries || session.mood_entries.length === 0)) {
      // Pass both the numeric ID and the UUID string
      await loadSessionMoodEntries(session.id, session.session_id);
    }
    
    if (!sessionMessages[session.id]) {
      await loadSessionMessages(session.id);
    }
  };

  const formatTime = (dateString: string) => {
    try {
      // Add 'Z' to indicate UTC if not present
      const utcString = dateString.endsWith('Z') ? dateString : dateString + 'Z';
      const date = new Date(utcString);
      
      if (isNaN(date.getTime())) {
        return 'Invalid time';
      }
      
      // Now the date is correctly parsed as UTC and displayed in local time
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } catch (error) {
      console.error('Error formatting time:', dateString, error);
      return 'Invalid time';
    }
  };

  const generateAnalyticsRecommendation = async (stats: any) => {
    try {
      setLoadingRecommendation(true);
      
      // Prepare mood statistics in the correct format
      const moodStats: MoodStatistics = {
        total_check_ins: stats.totalCheckIns,
        mood_distribution: stats.moodDistribution,
        average_intensity: stats.averageIntensity,
        common_emotions: Object.keys(stats.moodDistribution)
          .sort((a, b) => stats.moodDistribution[b] - stats.moodDistribution[a])
          .slice(0, 5),
        time_period: 'Last 30 days'
      };
      
      console.log('📊 Requesting recommendation with stats:', moodStats);
      
      const response = await getAnalyticsRecommendation(moodStats);
      setAnalyticsRecommendation(response.recommendation);
      setShowRecommendation(true);
    } catch (error) {
      console.error('Failed to generate recommendation:', error);
      alert('Failed to generate recommendation. Please try again.');
    } finally {
      setLoadingRecommendation(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      // Add 'Z' to indicate UTC if not present
      const utcString = dateString.endsWith('Z') ? dateString : dateString + 'Z';
      const date = new Date(utcString);
      
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      return date.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'Invalid date';
    }
  };

  const getMoodColor = (mood: string | undefined) => {
    if (!mood) return 'from-gray-100 to-slate-100';
    
    const moodColors: Record<string, string> = {
      'happy': 'from-yellow-100 to-orange-100',
      'sad': 'from-blue-100 to-indigo-100',
      'anxious': 'from-purple-100 to-pink-100',
      'calm': 'from-green-100 to-teal-100',
      'angry': 'from-red-100 to-orange-100',
      'neutral': 'from-gray-100 to-slate-100',
      'confused': 'from-amber-100 to-yellow-100',
      'tired': 'from-indigo-100 to-purple-100',
      'stressed': 'from-red-100 to-orange-100',
      'lonely': 'from-blue-100 to-indigo-100',
    };
    
    // For comma-separated moods, use the first mood's color
    const firstMood = mood.split(',')[0].trim().toLowerCase();
    return moodColors[firstMood] || 'from-gray-100 to-slate-100';
  };

  // Get the latest mood entry for display
  const getLatestMoodEntry = (session: UnifiedSession) => {
    if (!session.mood_entries || session.mood_entries.length === 0) {
      return null;
    }
    // Sort by created_at to get the most recent
    const sortedEntries = [...session.mood_entries].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return sortedEntries[0];
  };

  // Parse moods from comma-separated string OR emotions array
  const parseMoods = (moodEntry: any): string[] => {
    if (!moodEntry) return [];
    
    // First, try to get moods from emotions array if it exists
    if (moodEntry.emotions) {
      if (Array.isArray(moodEntry.emotions) && moodEntry.emotions.length > 0) {
        return moodEntry.emotions.filter((e: string) => e.trim());
      }
      if (typeof moodEntry.emotions === 'string' && moodEntry.emotions.trim()) {
        return moodEntry.emotions.split(',').map((e: string) => e.trim()).filter((e: string) => e);
      }
    }
    
    // Fallback to mood field (legacy or summary)
    if (moodEntry.mood && typeof moodEntry.mood === 'string') {
      // Check if it's a summary like "happy,sad,+6"
      const moodString = moodEntry.mood;
      if (moodString.includes('+')) {
        // This is a summary, return the actual moods if we have them in emotions
        return [];
      }
      return moodString.split(',').map((m: string) => m.trim()).filter((m: string) => m);
    }
    
    return [];
  };

  // Get emoji for a single mood
  const getMoodDisplay = (moodEntry: any) => {
    if (!moodEntry) return { emoji: '😐', label: 'No mood' };
    
    const moods = parseMoods(moodEntry);
    if (moods.length === 0) {
      // Try to get a display from the mood field
      if (moodEntry.mood && typeof moodEntry.mood === 'string') {
        return { 
          emoji: getMoodEmoji(moodEntry.mood.split(',')[0] || 'neutral'), 
          label: moodEntry.mood 
        };
      }
      return { emoji: '😐', label: 'No mood' };
    }
    
    if (moods.length === 1) {
      const emoji = getMoodEmoji(moods[0]);
      return { emoji, label: moods[0], allMoods: moods };
    }
    
    // For multiple moods, show first emoji
    const firstEmoji = getMoodEmoji(moods[0]);
    return { 
      emoji: firstEmoji, 
      label: `${moods.length} moods`,
      allMoods: moods
    };
  };

  // Calculate mood statistics for analytics view
  const moodStatistics = () => {
    const stats = {
      totalSessions: sessions.length,
      sessionsWithMood: sessions.filter(s => s.mood_entries && s.mood_entries.length > 0).length,
      moodDistribution: {} as Record<string, number>,
      averageIntensity: 0,
      totalCheckIns: 0,
    };
    
    let totalIntensity = 0;
    let moodCount = 0;
    
    sessions.forEach(session => {
      if (session.mood_entries && session.mood_entries.length > 0) {
        // Count ALL mood entries across all sessions
        session.mood_entries.forEach(entry => {
          // Parse the moods
          const moods = parseMoods(entry);
          
          // Count each individual mood
          moods.forEach(mood => {
            const moodKey = mood.toLowerCase().trim();
            stats.moodDistribution[moodKey] = (stats.moodDistribution[moodKey] || 0) + 1;
          });
          
          totalIntensity += entry.intensity;
          moodCount++;
          stats.totalCheckIns++;
        });
      }
    });
    
    stats.averageIntensity = moodCount > 0 ? Math.round((totalIntensity / moodCount) * 10) / 10 : 0;
    
    return stats;
  };

  // If viewing a chat session, show the full conversation
  if (selectedSessionChat) {
    const messages = sessionMessages[selectedSessionChat.id] || [];
    const latestMoodEntry = getLatestMoodEntry(selectedSessionChat);
    const moodDisplay = getMoodDisplay(latestMoodEntry);

    return (
      <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto flex flex-col">
        <div className="max-w-3xl mx-auto w-full flex-1">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 bg-white rounded-2xl p-4 shadow-md sticky top-0 z-10">
            <div className="flex-1 w-full sm:w-auto">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Chat Session</h2>
                {latestMoodEntry && (
                  <div className={`px-2 sm:px-3 py-1 rounded-full bg-gradient-to-r ${getMoodColor(latestMoodEntry.mood)}`}>
                    <span className="font-medium text-xs sm:text-sm capitalize flex items-center gap-1">
                      <Smile className="w-3 h-3 sm:w-4 sm:h-4" />
                      {moodDisplay.label} ({latestMoodEntry.intensity}/10)
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="truncate">{formatDate(selectedSessionChat.started_at)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
                  {selectedSessionChat.message_count} messages
                </div>
                {selectedSessionChat.mood_entry_count > 0 && (
                  <div className="flex items-center gap-1">
                    <Smile className="w-3 h-3 sm:w-4 sm:h-4" />
                    {selectedSessionChat.mood_entry_count} mood check-in{selectedSessionChat.mood_entry_count !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={() => setShowDeleteConfirm(selectedSessionChat.id)}
                className="p-2 hover:bg-red-50 rounded-xl transition-colors group"
                title="Delete this chat"
              >
                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 group-hover:text-red-600" />
              </button>
              <button
                onClick={() => setSelectedSessionChat(null)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Delete Confirmation Dialog */}
          {showDeleteConfirm === selectedSessionChat.id && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 sm:p-6 mb-6 shadow-md">
              <h3 className="font-semibold text-red-900 mb-2 text-sm sm:text-base">🗑️ Delete this chat session?</h3>
              <p className="text-xs sm:text-sm text-red-800 mb-4">
                This action cannot be undone. All messages and mood check-ins in this conversation will be permanently deleted.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={(e) => handleDeleteSession(selectedSessionChat.id, e)}
                  disabled={deletingSessionId === selectedSessionChat.id}
                  className="bg-red-600 text-white px-6 py-2 rounded-xl font-semibold hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {deletingSessionId === selectedSessionChat.id ? 'Deleting...' : 'Yes, Delete'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="bg-gray-200 text-gray-800 px-6 py-2 rounded-xl font-semibold hover:bg-gray-300 transition-all text-sm sm:text-base"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Mood History (if exists) */}
          {selectedSessionChat.mood_entry_count > 0 && (
            <div className="mb-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4 sm:p-5 border border-indigo-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm sm:text-base">
                  <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
                  Mood Check-in History ({selectedSessionChat.mood_entry_count})
                </h3>
                {(!selectedSessionChat.mood_entries || selectedSessionChat.mood_entries.length === 0) && (
                  <button
                    onClick={() => loadSessionMoodEntries(selectedSessionChat.id)}
                    disabled={loadingMoodEntries[selectedSessionChat.id]}
                    className="text-xs text-indigo-600 font-medium hover:text-indigo-700 px-3 py-1 bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loadingMoodEntries[selectedSessionChat.id] ? 'Loading...' : 'Load Mood Entries'}
                  </button>
                )}
              </div>
              
              {selectedSessionChat.mood_entries && selectedSessionChat.mood_entries.length > 0 ? (
                <div className="space-y-4">
                  {[...selectedSessionChat.mood_entries]
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((entry, index) => {
                      const moods = parseMoods(entry);
                      
                      return (
                        <div key={entry.id} className={`p-3 rounded-xl ${index === 0 ? 'bg-white/60' : 'bg-white/40'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className="text-2xl sm:text-3xl">
                                {moods.length > 0 ? getMoodEmoji(moods[0]) : '😐'}
                              </div>
                              <div>
                                <div className="font-bold text-sm sm:text-base">
                                  {moods.length === 1 
                                    ? moods[0].charAt(0).toUpperCase() + moods[0].slice(1)
                                    : `${moods.length} mood(s)`
                                  }
                                </div>
                                <div className="text-xs text-gray-600">Intensity: {entry.intensity}/10</div>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatTime(entry.created_at)}
                            </div>
                          </div>
                          
                          {/* Display ALL moods */}
                          {moods.length > 0 && (
                            <div className="mb-3">
                              <div className="text-xs text-gray-600 mb-1">Mood(s):</div>
                              <div className="flex flex-wrap gap-1">
                                {moods.map((mood, idx) => (
                                  <span 
                                    key={idx}
                                    className="px-2 py-0.5 bg-gradient-to-r from-indigo-400 to-purple-400 text-white text-xs rounded-full flex items-center gap-1"
                                  >
                                    {getMoodEmoji(mood)} {mood}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {entry.note && (
                            <div>
                              <div className="text-xs text-gray-600 mb-1">Notes:</div>
                              <div className="text-xs text-gray-800 bg-white/50 p-2 rounded break-words">
                                {entry.note}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Smile className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Mood entries will load when you click "Load Mood Entries"</p>
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          {loadingChat ? (
            <div className="text-center py-8">
              <div className="animate-spin inline-block">
                <MessageSquare className="w-8 h-8 text-indigo-600" />
              </div>
              <p className="text-gray-600 mt-2 text-sm sm:text-base">Loading conversation...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-600 text-sm sm:text-base">No messages in this session</p>
            </div>
          ) : (
            <div className="space-y-4 mb-6">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-xs px-3 sm:px-4 py-2 sm:py-3 rounded-2xl ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <p className="text-xs sm:text-sm break-words">{msg.text}</p>
                    <p className="text-xs mt-2 opacity-70 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Continue Chat Button */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                const formattedMessages: Message[] = messages.map(msg => ({
                  id: msg.id,
                  text: msg.text,
                  sender: msg.sender as 'user' | 'bot',
                  timestamp: formatTime(msg.created_at),
                  sessionId: selectedSessionChat.session_id,
                  sentiment: msg.sentiment as 'positive' | 'neutral' | 'negative',
                }));
                if (onOpenPreviousChat) onOpenPreviousChat(formattedMessages);
                setSelectedSessionChat(null);
              }}
              className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 rounded-2xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105 text-sm sm:text-base"
            >
              Continue This Chat
            </button>
            <button
              onClick={() => setSelectedSessionChat(null)}
              className="flex-1 bg-gray-100 text-indigo-600 py-3 rounded-2xl font-semibold hover:bg-gray-200 transition-all duration-300 hover:scale-105 text-sm sm:text-base"
            >
              Back to History
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main History View
  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6 sm:mb-8">
          Your Wellness History
        </h2>

        {/* Guest Warning */}
        {isGuest && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-md">
            <h3 className="font-semibold text-amber-900 mb-2 text-sm sm:text-base">📝 Your history won't be saved</h3>
            <p className="text-xs sm:text-sm text-amber-800 mb-4">
              As a guest, your chat history is stored only in your browser and will be lost when you log out. Create an account or log in to save your conversations permanently!
            </p>
            {onShowLogin && (
              <div className="flex gap-3">
                <button
                  onClick={onShowLogin}
                  className="bg-amber-600 text-white px-4 sm:px-6 py-2 rounded-xl font-semibold hover:bg-amber-700 transition-all text-sm sm:text-base"
                >
                  Log In / Create Account
                </button>
              </div>
            )}
          </div>
        )}

        {/* View Toggle for authenticated users */}
        {isAuthenticated && !isGuest && (
          <div className="flex gap-2 sm:gap-4 mb-6 sm:mb-8 border-b-2 border-gray-200 overflow-x-auto">
            <button
              onClick={() => setActiveView('sessions')}
              className={`py-2 sm:py-3 px-3 sm:px-6 font-semibold transition-all flex items-center gap-2 whitespace-nowrap text-sm sm:text-base ${
                activeView === 'sessions'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-indigo-600'
              }`}
            >
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Wellness Sessions ({sessions.length})</span>
              <span className="sm:hidden">Sessions ({sessions.length})</span>
            </button>
            <button
              onClick={() => setActiveView('analytics')}
              className={`py-2 sm:py-3 px-3 sm:px-6 font-semibold transition-all flex items-center gap-2 whitespace-nowrap text-sm sm:text-base ${
                activeView === 'analytics'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-indigo-600'
              }`}
            >
              <BarChart className="w-3 h-3 sm:w-4 sm:h-4" />
              Analytics
            </button>
          </div>
        )}

        {/* Sessions View */}
        {activeView === 'sessions' && (
          <>
            {loadingSessions ? (
              <div className="text-center py-16">
                <div className="animate-spin inline-block">
                  <HistoryIcon className="w-12 h-12 text-indigo-600" />
                </div>
                <p className="text-gray-600 mt-4 text-sm sm:text-base">Loading your wellness sessions...</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-16">
                <div className="bg-gradient-to-br from-indigo-100 to-purple-100 p-6 rounded-3xl inline-block mb-6 shadow-lg">
                  <MessageSquare className="w-12 h-12 sm:w-16 sm:h-16 text-indigo-600" />
                </div>
                <p className="text-gray-600 text-sm sm:text-base lg:text-lg px-4">No previous wellness sessions. Start a new conversation!</p>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-5">
                {sessions.map((session) => {
                  const hasMoodEntries = session.mood_entry_count > 0;
                  const latestMoodEntry = getLatestMoodEntry(session);
                  const moodDisplay = getMoodDisplay(latestMoodEntry);
                  
                  return (
                    <div
                      key={session.id}
                      className="bg-white border-2 border-gray-100 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-102 group cursor-pointer"
                      onClick={() => openChatSession(session)}
                    >
                      <div className="flex items-start justify-between mb-4 gap-3">
                        <div className="flex items-start space-x-3 sm:space-x-4 flex-1 min-w-0">
                          {/* Mood Icon or Chat Icon */}
                          <div className={`bg-gradient-to-br ${hasMoodEntries ? 'from-yellow-100 to-orange-100' : 'from-gray-100 to-slate-100'} p-2 sm:p-3 rounded-xl sm:rounded-2xl group-hover:scale-110 transition-transform flex-shrink-0`}>
                            {hasMoodEntries ? (
                              <Smile className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
                            ) : (
                              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            {/* Session Title */}
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h3 className="font-bold text-base sm:text-lg text-gray-800 group-hover:text-indigo-600 transition-colors truncate">
                                {hasMoodEntries ? 'Wellness Session' : 'Chat Session'}
                              </h3>
                              {hasMoodEntries && (
                                <span className="text-xs sm:text-sm font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 flex-shrink-0">
                                  {session.mood_entry_count} mood check-in{session.mood_entry_count !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                            
                            {/* Session Date */}
                            <div className="text-xs sm:text-sm text-gray-500 font-medium flex items-center gap-1 sm:gap-2 mb-2">
                              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                              <span className="truncate">{formatDate(session.started_at)}</span>
                            </div>
                            
                            {/* Mood Information */}
                            {hasMoodEntries && (
                              <div className="mb-3">
                                {latestMoodEntry ? (
                                  <>
                                    <div className="flex items-center gap-2 mb-2 p-2 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl">
                                      <span className="text-xl">
                                        {moodDisplay.emoji}
                                      </span>
                                      <div className="flex-1">
                                        <div className="text-sm font-medium capitalize">
                                          {moodDisplay.label}
                                        </div>
                                        <div className="text-xs text-gray-500">Intensity: {latestMoodEntry.intensity}/10</div>
                                      </div>
                                      <div className="text-xs text-gray-400">
                                        {formatTime(latestMoodEntry.created_at)}
                                      </div>
                                    </div>
                                    
                                    {/* Show ALL individual moods */}
                                    {moodDisplay.allMoods && moodDisplay.allMoods.length > 1 && (
                                      <div className="mb-2">
                                        <div className="text-xs text-gray-600 mb-1">Mood(s):</div>
                                        <div className="flex flex-wrap gap-1">
                                          {moodDisplay.allMoods.map((mood, idx) => (
                                            <span 
                                              key={idx}
                                              className="px-1.5 py-0.5 bg-gradient-to-r from-indigo-400 to-purple-400 text-white text-xs rounded-full flex items-center gap-1"
                                            >
                                              {getMoodEmoji(mood)} {mood}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Note */}
                                    {latestMoodEntry.note && (
                                      <p className="text-xs text-gray-600 mt-2 line-clamp-2 break-words bg-gray-50 p-2 rounded">
                                        "{latestMoodEntry.note}"
                                      </p>
                                    )}
                                    
                                    {/* Show if there are more mood entries */}
                                    {session.mood_entries && session.mood_entries.length > 1 && (
                                      <div className="text-xs text-indigo-600 font-medium mt-1">
                                        +{session.mood_entries.length - 1} earlier mood check-in{session.mood_entries.length - 1 !== 1 ? 's' : ''}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className="flex items-center justify-between">
                                    <div className="text-xs text-amber-600 font-medium flex items-center gap-1">
                                      <Smile className="w-3 h-3" />
                                      {session.mood_entry_count} mood check-in{session.mood_entry_count !== 1 ? 's' : ''} available
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        loadSessionMoodEntries(session.id, session.session_id);
                                      }}
                                      disabled={loadingMoodEntries[session.id]}
                                      className="text-xs text-indigo-600 font-medium hover:text-indigo-700 px-2 py-1 bg-indigo-50 rounded transition-colors disabled:opacity-50"
                                    >
                                      {loadingMoodEntries[session.id] ? 'Loading...' : 'Load'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Message preview */}
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" />
                                {session.message_count} msg{session.message_count !== 1 ? 's' : ''}
                              </span>
                              <span className="hidden sm:inline">•</span>
                              <span className="truncate max-w-[200px] sm:max-w-xs">
                                Last: {session.last_message_preview}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Message count badge */}
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs text-gray-600 font-semibold mb-1">Msgs</div>
                          <div className="font-bold text-xl sm:text-2xl bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                            {session.message_count}
                          </div>
                        </div>
                      </div>
                      
                      {/* Delete Button */}
                      <div className="mt-3 flex justify-end" onClick={(e) => e.stopPropagation()}>
                        {showDeleteConfirm === session.id ? (
                          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center w-full sm:w-auto">
                            <span className="text-xs sm:text-sm text-gray-600 text-center sm:text-left sm:mr-2">Delete this session?</span>
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => handleDeleteSession(session.id, e)}
                                disabled={deletingSessionId === session.id}
                                className="flex-1 sm:flex-none bg-red-600 text-white px-3 sm:px-4 py-2 rounded-xl font-semibold hover:bg-red-700 transition-all text-xs sm:text-sm disabled:opacity-50"
                              >
                                {deletingSessionId === session.id ? 'Deleting...' : 'Confirm'}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowDeleteConfirm(null);
                                }}
                                className="flex-1 sm:flex-none bg-gray-200 text-gray-800 px-3 sm:px-4 py-2 rounded-xl font-semibold hover:bg-gray-300 transition-all text-xs sm:text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDeleteConfirm(session.id);
                            }}
                            className="flex items-center gap-2 text-red-600 hover:text-red-700 px-3 sm:px-4 py-2 rounded-xl hover:bg-red-50 transition-all font-semibold text-xs sm:text-sm"
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Analytics View */}
        {activeView === 'analytics' && (
          <div className="space-y-6">
            {(() => {
              const stats = moodStatistics();
              
              return (
                <>
                  {/* AI Recommendation Button - Show at top if data exists */}
                  {Object.keys(stats.moodDistribution).length > 0 && (
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg border border-indigo-100">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="bg-white p-2 rounded-xl">
                            <Sparkles className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                            <h3 className="text-base sm:text-lg font-bold text-gray-800">
                              AI Wellness Insights
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600">
                              Get personalized recommendations based on your patterns
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => generateAnalyticsRecommendation(stats)}
                        disabled={loadingRecommendation}
                        className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 rounded-xl sm:rounded-2xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {loadingRecommendation ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Generating insights...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5" />
                            Get AI Wellness Recommendations
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Recommendation Display Modal */}
                  {showRecommendation && analyticsRecommendation && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                      <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-gray-100 animate-scale-in max-h-[90vh] overflow-y-auto">
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-br from-indigo-100 to-purple-100 p-3 rounded-2xl">
                              <Sparkles className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div>
                              <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                Your Wellness Insights
                              </h3>
                              <p className="text-sm text-gray-600">Based on your {stats.totalCheckIns} mood check-ins</p>
                            </div>
                          </div>
                          <button
                            onClick={() => setShowRecommendation(false)}
                            className="p-2 hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0"
                          >
                            <X className="w-5 h-5 text-gray-600" />
                          </button>
                        </div>

                        {/* Stats Summary */}
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4 mb-6 border border-indigo-100">
                          <div className="grid grid-cols-3 gap-2 sm:gap-4">
                            <div className="text-center">
                              <div className="text-lg sm:text-2xl font-bold text-indigo-600">{stats.totalCheckIns}</div>
                              <div className="text-xs text-gray-600">Check-ins</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg sm:text-2xl font-bold text-purple-600">{stats.averageIntensity}</div>
                              <div className="text-xs text-gray-600">Avg Intensity</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg sm:text-2xl capitalize font-bold text-pink-600">
                                {getMoodEmoji(Object.keys(stats.moodDistribution).sort((a, b) => 
                                  stats.moodDistribution[b] - stats.moodDistribution[a]
                                )[0] || '')}
                              </div>
                              <div className="text-xs text-gray-600">Top Mood</div>
                            </div>
                          </div>
                        </div>

                        {/* Recommendation Content */}
                        <div className="bg-white rounded-2xl p-5 border-2 border-gray-100 mb-6">
                          <div className="flex items-center gap-2 mb-3">
                            <Heart className="w-5 h-5 text-pink-500" />
                            <p className="font-semibold text-gray-800">Your Personalized Insights:</p>
                          </div>
                          <div className="text-gray-700 leading-relaxed whitespace-pre-line text-sm sm:text-base">
                            {analyticsRecommendation}
                          </div>
                        </div>

                        {/* Action Button */}
                        <button
                          onClick={() => setShowRecommendation(false)}
                          className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 rounded-2xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105"
                        >
                          Got it, thanks!
                        </button>

                        <p className="text-xs text-gray-500 text-center mt-4">
                          💡 These insights are based on your patterns. For professional support, please consult a healthcare provider.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Overview Stats */}
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <BarChart className="w-4 h-4 sm:w-5 sm:h-5" />
                      Your Wellness Overview
                    </h3>
                    
                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                      <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center shadow-sm">
                        <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-indigo-600">{stats.totalSessions}</div>
                        <div className="text-xs sm:text-sm text-gray-600 mt-1">Total Sessions</div>
                      </div>
                      <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center shadow-sm">
                        <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-purple-600">{stats.totalCheckIns}</div>
                        <div className="text-xs sm:text-sm text-gray-600 mt-1">Check-ins</div>
                      </div>
                      <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center shadow-sm">
                        <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-pink-600">{stats.averageIntensity}</div>
                        <div className="text-xs sm:text-sm text-gray-600 mt-1">Avg. Intensity</div>
                      </div>
                    </div>
                  </div>
                  {/* Mood Distribution */}
                  {Object.keys(stats.moodDistribution).length > 0 && (
                    <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
                        Mood Distribution
                      </h3>
                      <div className="space-y-3 sm:space-y-4">
                        {Object.entries(stats.moodDistribution)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 15) // Show top 15 moods
                          .map(([mood, count]) => {
                            const percentage = (count / stats.totalCheckIns) * 100;
                            return (
                              <div key={mood} className="flex items-center gap-2 sm:gap-0">
                                <div className="w-24 sm:w-32 flex items-center gap-2 sm:gap-3 flex-shrink-0">
                                  <span className="text-xl sm:text-2xl">{getMoodEmoji(mood)}</span>
                                  <div className="min-w-0">
                                    <div className="font-medium capitalize text-xs sm:text-sm truncate">{mood}</div>
                                    <div className="text-xs text-gray-500">{count} {count !== 1 ? 'times' : 'time'}</div>
                                  </div>
                                </div>
                                <div className="flex-1 ml-2 sm:ml-4">
                                  <div className="h-3 sm:h-4 rounded-full overflow-hidden bg-gray-100">
                                    <div 
                                      className={`h-full rounded-full bg-gradient-to-r ${getMoodColor(mood)}`}
                                      style={{ width: `${Math.min(percentage, 100)}%` }}
                                    />
                                  </div>
                                </div>
                                <div className="ml-2 sm:ml-4 w-12 sm:w-16 text-right font-semibold text-gray-700 text-xs sm:text-sm">
                                  {percentage.toFixed(1)}%
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* No data state */}
                  {Object.keys(stats.moodDistribution).length === 0 && (
                    <div className="text-center py-12 bg-white rounded-2xl sm:rounded-3xl shadow-lg">
                      <BarChart className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-2 text-sm sm:text-base px-4">No mood data available yet.</p>
                      <p className="text-xs sm:text-sm text-gray-500 px-4">Start checking in your mood during chat sessions!</p>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}



// import { useState, useEffect } from 'react';
// import type { Message } from '../types';
// import { 
//   History as HistoryIcon, 
//   MessageSquare, 
//   X, 
//   Trash2, 
//   Calendar, 
//   BarChart,
//   Smile,
//   Clock
// } from 'lucide-react';
// import { 
//   getUnifiedSessions, 
//   getChatHistory, 
//   deleteSession, 
//   type UnifiedSession 
// } from '../services/apiService';

// interface HistoryProps {
//   getMoodEmoji: (mood: string) => string;
//   isAuthenticated?: boolean;
//   isGuest?: boolean;
//   onOpenPreviousChat?: (messages: Message[]) => void;
//   onShowLogin?: () => void;
// }

// interface ChatMessage {
//   id: number;
//   session_id: number;
//   user_id: number | null;
//   sender: string;
//   text: string;
//   sentiment: string;
//   created_at: string;
// }

// export default function History({ 
//   getMoodEmoji, 
//   isAuthenticated, 
//   isGuest, 
//   onOpenPreviousChat, 
//   onShowLogin 
// }: HistoryProps) {
//   const [sessions, setSessions] = useState<UnifiedSession[]>([]);
//   const [loadingSessions, setLoadingSessions] = useState(false);
//   const [sessionMessages, setSessionMessages] = useState<Record<number, ChatMessage[]>>({});
//   const [selectedSessionChat, setSelectedSessionChat] = useState<UnifiedSession | null>(null);
//   const [loadingChat, setLoadingChat] = useState(false);
//   const [deletingSessionId, setDeletingSessionId] = useState<number | null>(null);
//   const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
//   const [activeView, setActiveView] = useState<'sessions' | 'analytics'>('sessions');
//   const [loadingMoodEntries, setLoadingMoodEntries] = useState<Record<number, boolean>>({});

//   useEffect(() => {
//     if (activeView === 'analytics') {
//       loadAllMoodEntries();
//     }
//   }, [activeView]);

//   // Add this function to load mood entries for all sessions
//   const loadAllMoodEntries = async () => {
//     // Only load for sessions that have mood entries but haven't been loaded
//     const sessionsToLoad = sessions.filter(
//       session => session.mood_entry_count > 0 && 
//       (!session.mood_entries || session.mood_entries.length === 0)
//     );
    
//     if (sessionsToLoad.length === 0) return;
    
//     console.log('📊 Loading mood entries for analytics...');
    
//     // Load mood entries for each session
//     for (const session of sessionsToLoad) {
//       await loadSessionMoodEntries(session.id, session.session_id);
//     }
//   };

//   // Load unified sessions for authenticated users
//   useEffect(() => {
//     if (isAuthenticated && !isGuest) {
//       loadUnifiedSessions();
//     }
//   }, [isAuthenticated, isGuest]);

//   const loadUnifiedSessions = async () => {
//     try {
//       setLoadingSessions(true);
//       const data = await getUnifiedSessions();
//       console.log('📊 Loaded unified sessions:', data);
//       console.log('📊 Session count:', data.sessions.length);
      
//       // Debug each session
//       data.sessions.forEach((session: UnifiedSession, index: number) => {
//         console.log(`Session ${index + 1}:`, {
//           id: session.id,
//           mood_entry_count: session.mood_entry_count,
//           has_mood_entries: !!session.mood_entries,
//           mood_entries_length: session.mood_entries?.length || 0,
//           mood_entries: session.mood_entries
//         });
//       });
      
//       setSessions(data.sessions);
//     } catch (error) {
//       console.error('Failed to load unified sessions:', error);
//     } finally {
//       setLoadingSessions(false);
//     }
//   };

//   const loadSessionMoodEntries = async (sessionId: number, sessionUUID?: string) => {
//     try {
//       setLoadingMoodEntries(prev => ({ ...prev, [sessionId]: true }));
      
//       let endpoint = '';
//       const flaskBaseUrl = 'http://localhost:5000'; // Your Flask URL
      
//       // If we have a UUID, use it, otherwise use numeric ID
//       if (sessionUUID) {
//         endpoint = `${flaskBaseUrl}/api/mood/session/${sessionUUID}/entries`;
//       } else {
//         // Try numeric endpoint or get UUID from sessions array
//         const session = sessions.find(s => s.id === sessionId);
//         if (session?.session_id) {
//           endpoint = `${flaskBaseUrl}/api/mood/session/${session.session_id}/entries`;
//         } else {
//           endpoint = `${flaskBaseUrl}/api/mood/session/numeric/${sessionId}/entries`;
//         }
//       }
      
//       console.log('📊 Fetching mood entries from:', endpoint);
      
//       const response = await fetch(endpoint, {
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         credentials: 'include', // Include cookies if needed
//       });
      
//       console.log('Response status:', response.status);
      
//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }
      
//       const data = await response.json();
      
//       console.log('📊 Loaded mood entries:', data);
      
//       if (data.mood_entries && data.mood_entries.length > 0) {
//         // Update the session with mood entries
//         setSessions(prev => prev.map(s => 
//           s.id === sessionId 
//             ? { ...s, mood_entries: data.mood_entries }
//             : s
//         ));
        
//         // Also update selected session if it's open
//         if (selectedSessionChat?.id === sessionId) {
//           setSelectedSessionChat(prev => 
//             prev ? { ...prev, mood_entries: data.mood_entries } : null
//           );
//         }
//       }
//     } catch (error) {
//       console.error('Failed to load mood entries:', error);
//     } finally {
//       setLoadingMoodEntries(prev => ({ ...prev, [sessionId]: false }));
//     }
//   };

//   const loadSessionMessages = async (sessionId: number) => {
//     if (sessionMessages[sessionId]) return;
//     try {
//       setLoadingChat(true);
//       const data = await getChatHistory(sessionId);
//       setSessionMessages(prev => ({
//         ...prev,
//         [sessionId]: data.messages
//       }));
//     } catch (error) {
//       console.error('Failed to load session messages:', error);
//     } finally {
//       setLoadingChat(false);
//     }
//   };

//   const handleDeleteSession = async (sessionId: number, e: React.MouseEvent) => {
//     e.stopPropagation();
//     try {
//       setDeletingSessionId(sessionId);
//       console.log('🗑️ Deleting session:', sessionId);
      
//       await deleteSession(sessionId);
      
//       console.log('✅ Delete successful');
      
//       setSessions(prev => prev.filter(s => s.id !== sessionId));
//       setSessionMessages(prev => {
//         const newMessages = { ...prev };
//         delete newMessages[sessionId];
//         return newMessages;
//       });
//       setShowDeleteConfirm(null);
      
//       if (selectedSessionChat?.id === sessionId) {
//         setSelectedSessionChat(null);
//       }
      
//     } catch (error) {
//       console.error('❌ Failed to delete session:', error);
//       alert(`Failed to delete chat session: ${error instanceof Error ? error.message : 'Unknown error'}`);
//     } finally {
//       setDeletingSessionId(null);
//     }
//   };

//   const openChatSession = async (session: UnifiedSession) => {
//     setSelectedSessionChat(session);
    
//     // Load mood entries if they exist but aren't loaded
//     if (session.mood_entry_count > 0 && (!session.mood_entries || session.mood_entries.length === 0)) {
//       // Pass both the numeric ID and the UUID string
//       await loadSessionMoodEntries(session.id, session.session_id);
//     }
    
//     if (!sessionMessages[session.id]) {
//       await loadSessionMessages(session.id);
//     }
//   };

//   const formatTime = (dateString: string) => {
//     try {
//       // Add 'Z' to indicate UTC if not present
//       const utcString = dateString.endsWith('Z') ? dateString : dateString + 'Z';
//       const date = new Date(utcString);
      
//       if (isNaN(date.getTime())) {
//         return 'Invalid time';
//       }
      
//       // Now the date is correctly parsed as UTC and displayed in local time
//       return date.toLocaleTimeString('en-US', { 
//         hour: '2-digit', 
//         minute: '2-digit',
//         hour12: true 
//       });
//     } catch (error) {
//       console.error('Error formatting time:', dateString, error);
//       return 'Invalid time';
//     }
//   };

//   const formatDate = (dateString: string) => {
//     try {
//       // Add 'Z' to indicate UTC if not present
//       const utcString = dateString.endsWith('Z') ? dateString : dateString + 'Z';
//       const date = new Date(utcString);
      
//       if (isNaN(date.getTime())) {
//         return 'Invalid date';
//       }
      
//       return date.toLocaleString('en-US', { 
//         month: 'short', 
//         day: 'numeric', 
//         year: 'numeric',
//         hour: '2-digit', 
//         minute: '2-digit',
//         hour12: true 
//       });
//     } catch (error) {
//       console.error('Error formatting date:', dateString, error);
//       return 'Invalid date';
//     }
//   };

//   const getMoodColor = (mood: string | undefined) => {
//     if (!mood) return 'from-gray-100 to-slate-100';
    
//     const moodColors: Record<string, string> = {
//       'happy': 'from-yellow-100 to-orange-100',
//       'sad': 'from-blue-100 to-indigo-100',
//       'anxious': 'from-purple-100 to-pink-100',
//       'calm': 'from-green-100 to-teal-100',
//       'angry': 'from-red-100 to-orange-100',
//       'neutral': 'from-gray-100 to-slate-100',
//       'confused': 'from-amber-100 to-yellow-100',
//       'tired': 'from-indigo-100 to-purple-100',
//       'stressed': 'from-red-100 to-orange-100',
//       'lonely': 'from-blue-100 to-indigo-100',
//     };
    
//     // For comma-separated moods, use the first mood's color
//     const firstMood = mood.split(',')[0].trim().toLowerCase();
//     return moodColors[firstMood] || 'from-gray-100 to-slate-100';
//   };

//   // Get the latest mood entry for display
//   const getLatestMoodEntry = (session: UnifiedSession) => {
//     if (!session.mood_entries || session.mood_entries.length === 0) {
//       return null;
//     }
//     // Sort by created_at to get the most recent
//     const sortedEntries = [...session.mood_entries].sort((a, b) => 
//       new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
//     );
//     return sortedEntries[0];
//   };

//   // Parse moods from comma-separated string OR emotions array
//   const parseMoods = (moodEntry: any): string[] => {
//     if (!moodEntry) return [];
    
//     // First, try to get moods from emotions array if it exists
//     if (moodEntry.emotions) {
//       if (Array.isArray(moodEntry.emotions) && moodEntry.emotions.length > 0) {
//         return moodEntry.emotions.filter((e: string) => e.trim());
//       }
//       if (typeof moodEntry.emotions === 'string' && moodEntry.emotions.trim()) {
//         return moodEntry.emotions.split(',').map((e: string) => e.trim()).filter((e: string) => e);
//       }
//     }
    
//     // Fallback to mood field (legacy or summary)
//     if (moodEntry.mood && typeof moodEntry.mood === 'string') {
//       // Check if it's a summary like "happy,sad,+6"
//       const moodString = moodEntry.mood;
//       if (moodString.includes('+')) {
//         // This is a summary, return the actual moods if we have them in emotions
//         return [];
//       }
//       return moodString.split(',').map((m: string) => m.trim()).filter((m: string) => m);
//     }
    
//     return [];
//   };

//   // Get emoji for a single mood
//   const getMoodDisplay = (moodEntry: any) => {
//     if (!moodEntry) return { emoji: '😐', label: 'No mood' };
    
//     const moods = parseMoods(moodEntry);
//     if (moods.length === 0) {
//       // Try to get a display from the mood field
//       if (moodEntry.mood && typeof moodEntry.mood === 'string') {
//         return { 
//           emoji: getMoodEmoji(moodEntry.mood.split(',')[0] || 'neutral'), 
//           label: moodEntry.mood 
//         };
//       }
//       return { emoji: '😐', label: 'No mood' };
//     }
    
//     if (moods.length === 1) {
//       const emoji = getMoodEmoji(moods[0]);
//       return { emoji, label: moods[0], allMoods: moods };
//     }
    
//     // For multiple moods, show first emoji
//     const firstEmoji = getMoodEmoji(moods[0]);
//     return { 
//       emoji: firstEmoji, 
//       label: `${moods.length} moods`,
//       allMoods: moods
//     };
//   };

//   // Calculate mood statistics for analytics view
//   const moodStatistics = () => {
//     const stats = {
//       totalSessions: sessions.length,
//       sessionsWithMood: sessions.filter(s => s.mood_entries && s.mood_entries.length > 0).length,
//       moodDistribution: {} as Record<string, number>,
//       averageIntensity: 0,
//       totalCheckIns: 0,
//     };
    
//     let totalIntensity = 0;
//     let moodCount = 0;
    
//     sessions.forEach(session => {
//       if (session.mood_entries && session.mood_entries.length > 0) {
//         // Count ALL mood entries across all sessions
//         session.mood_entries.forEach(entry => {
//           // Parse the moods
//           const moods = parseMoods(entry);
          
//           // Count each individual mood
//           moods.forEach(mood => {
//             const moodKey = mood.toLowerCase().trim();
//             stats.moodDistribution[moodKey] = (stats.moodDistribution[moodKey] || 0) + 1;
//           });
          
//           totalIntensity += entry.intensity;
//           moodCount++;
//           stats.totalCheckIns++;
//         });
//       }
//     });
    
//     stats.averageIntensity = moodCount > 0 ? Math.round((totalIntensity / moodCount) * 10) / 10 : 0;
    
//     return stats;
//   };

//   // If viewing a chat session, show the full conversation
//   if (selectedSessionChat) {
//     const messages = sessionMessages[selectedSessionChat.id] || [];
//     const latestMoodEntry = getLatestMoodEntry(selectedSessionChat);
//     const moodDisplay = getMoodDisplay(latestMoodEntry);

//     return (
//       <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto flex flex-col">
//         <div className="max-w-3xl mx-auto w-full flex-1">
//           {/* Header */}
//           <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 bg-white rounded-2xl p-4 shadow-md sticky top-0 z-10">
//             <div className="flex-1 w-full sm:w-auto">
//               <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
//                 <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Chat Session</h2>
//                 {latestMoodEntry && (
//                   <div className={`px-2 sm:px-3 py-1 rounded-full bg-gradient-to-r ${getMoodColor(latestMoodEntry.mood)}`}>
//                     <span className="font-medium text-xs sm:text-sm capitalize flex items-center gap-1">
//                       <Smile className="w-3 h-3 sm:w-4 sm:h-4" />
//                       {moodDisplay.label} ({latestMoodEntry.intensity}/10)
//                     </span>
//                   </div>
//                 )}
//               </div>
//               <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
//                 <div className="flex items-center gap-1">
//                   <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
//                   <span className="truncate">{formatDate(selectedSessionChat.started_at)}</span>
//                 </div>
//                 <div className="flex items-center gap-1">
//                   <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
//                   {selectedSessionChat.message_count} messages
//                 </div>
//                 {selectedSessionChat.mood_entry_count > 0 && (
//                   <div className="flex items-center gap-1">
//                     <Smile className="w-3 h-3 sm:w-4 sm:h-4" />
//                     {selectedSessionChat.mood_entry_count} mood check-in{selectedSessionChat.mood_entry_count !== 1 ? 's' : ''}
//                   </div>
//                 )}
//               </div>
//             </div>
//             <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
//               <button
//                 onClick={() => setShowDeleteConfirm(selectedSessionChat.id)}
//                 className="p-2 hover:bg-red-50 rounded-xl transition-colors group"
//                 title="Delete this chat"
//               >
//                 <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 group-hover:text-red-600" />
//               </button>
//               <button
//                 onClick={() => setSelectedSessionChat(null)}
//                 className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
//               >
//                 <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
//               </button>
//             </div>
//           </div>

//           {/* Delete Confirmation Dialog */}
//           {showDeleteConfirm === selectedSessionChat.id && (
//             <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 sm:p-6 mb-6 shadow-md">
//               <h3 className="font-semibold text-red-900 mb-2 text-sm sm:text-base">🗑️ Delete this chat session?</h3>
//               <p className="text-xs sm:text-sm text-red-800 mb-4">
//                 This action cannot be undone. All messages and mood check-ins in this conversation will be permanently deleted.
//               </p>
//               <div className="flex flex-col sm:flex-row gap-3">
//                 <button
//                   onClick={(e) => handleDeleteSession(selectedSessionChat.id, e)}
//                   disabled={deletingSessionId === selectedSessionChat.id}
//                   className="bg-red-600 text-white px-6 py-2 rounded-xl font-semibold hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
//                 >
//                   {deletingSessionId === selectedSessionChat.id ? 'Deleting...' : 'Yes, Delete'}
//                 </button>
//                 <button
//                   onClick={() => setShowDeleteConfirm(null)}
//                   className="bg-gray-200 text-gray-800 px-6 py-2 rounded-xl font-semibold hover:bg-gray-300 transition-all text-sm sm:text-base"
//                 >
//                   Cancel
//                 </button>
//               </div>
//             </div>
//           )}

//           {/* Mood History (if exists) */}
//           {selectedSessionChat.mood_entry_count > 0 && (
//             <div className="mb-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4 sm:p-5 border border-indigo-100">
//               <div className="flex items-center justify-between mb-3">
//                 <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm sm:text-base">
//                   <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
//                   Mood Check-in History ({selectedSessionChat.mood_entry_count})
//                 </h3>
//                 {(!selectedSessionChat.mood_entries || selectedSessionChat.mood_entries.length === 0) && (
//                   <button
//                     onClick={() => loadSessionMoodEntries(selectedSessionChat.id)}
//                     disabled={loadingMoodEntries[selectedSessionChat.id]}
//                     className="text-xs text-indigo-600 font-medium hover:text-indigo-700 px-3 py-1 bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
//                   >
//                     {loadingMoodEntries[selectedSessionChat.id] ? 'Loading...' : 'Load Mood Entries'}
//                   </button>
//                 )}
//               </div>
              
//               {selectedSessionChat.mood_entries && selectedSessionChat.mood_entries.length > 0 ? (
//                 <div className="space-y-4">
//                   {[...selectedSessionChat.mood_entries]
//                     .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
//                     .map((entry, index) => {
//                       const moods = parseMoods(entry);
                      
//                       return (
//                         <div key={entry.id} className={`p-3 rounded-xl ${index === 0 ? 'bg-white/60' : 'bg-white/40'}`}>
//                           <div className="flex items-center justify-between mb-2">
//                             <div className="flex items-center gap-3">
//                               <div className="text-2xl sm:text-3xl">
//                                 {moods.length > 0 ? getMoodEmoji(moods[0]) : '😐'}
//                               </div>
//                               <div>
//                                 <div className="font-bold text-sm sm:text-base">
//                                   {moods.length === 1 
//                                     ? moods[0].charAt(0).toUpperCase() + moods[0].slice(1)
//                                     : `${moods.length} mood(s)`
//                                   }
//                                 </div>
//                                 <div className="text-xs text-gray-600">Intensity: {entry.intensity}/10</div>
//                               </div>
//                             </div>
//                             <div className="text-xs text-gray-500">
//                               {formatTime(entry.created_at)}
//                             </div>
//                           </div>
                          
//                           {/* Display ALL moods */}
//                           {moods.length > 0 && (
//                             <div className="mb-3">
//                               <div className="text-xs text-gray-600 mb-1">Mood(s):</div>
//                               <div className="flex flex-wrap gap-1">
//                                 {moods.map((mood, idx) => (
//                                   <span 
//                                     key={idx}
//                                     className="px-2 py-0.5 bg-gradient-to-r from-indigo-400 to-purple-400 text-white text-xs rounded-full flex items-center gap-1"
//                                   >
//                                     {getMoodEmoji(mood)} {mood}
//                                   </span>
//                                 ))}
//                               </div>
//                             </div>
//                           )}
                          
//                           {entry.note && (
//                             <div>
//                               <div className="text-xs text-gray-600 mb-1">Notes:</div>
//                               <div className="text-xs text-gray-800 bg-white/50 p-2 rounded break-words">
//                                 {entry.note}
//                               </div>
//                             </div>
//                           )}
//                         </div>
//                       );
//                     })}
//                 </div>
//               ) : (
//                 <div className="text-center py-6">
//                   <Smile className="w-8 h-8 text-gray-400 mx-auto mb-2" />
//                   <p className="text-sm text-gray-600">Mood entries will load when you click "Load Mood Entries"</p>
//                 </div>
//               )}
//             </div>
//           )}

//           {/* Messages */}
//           {loadingChat ? (
//             <div className="text-center py-8">
//               <div className="animate-spin inline-block">
//                 <MessageSquare className="w-8 h-8 text-indigo-600" />
//               </div>
//               <p className="text-gray-600 mt-2 text-sm sm:text-base">Loading conversation...</p>
//             </div>
//           ) : messages.length === 0 ? (
//             <div className="text-center py-16">
//               <p className="text-gray-600 text-sm sm:text-base">No messages in this session</p>
//             </div>
//           ) : (
//             <div className="space-y-4 mb-6">
//               {messages.map((msg) => (
//                 <div
//                   key={msg.id}
//                   className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
//                 >
//                   <div
//                     className={`max-w-[85%] sm:max-w-xs px-3 sm:px-4 py-2 sm:py-3 rounded-2xl ${
//                       msg.sender === 'user'
//                         ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
//                         : 'bg-gray-100 text-gray-800'
//                     }`}
//                   >
//                     <p className="text-xs sm:text-sm break-words">{msg.text}</p>
//                     <p className="text-xs mt-2 opacity-70 flex items-center gap-1">
//                       <Clock className="w-3 h-3" />
//                       {formatTime(msg.created_at)}
//                     </p>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}

//           {/* Continue Chat Button */}
//           <div className="mt-6 flex flex-col sm:flex-row gap-3">
//             <button
//               onClick={() => {
//                 const formattedMessages: Message[] = messages.map(msg => ({
//                   id: msg.id,
//                   text: msg.text,
//                   sender: msg.sender as 'user' | 'bot',
//                   timestamp: formatTime(msg.created_at),
//                   sessionId: selectedSessionChat.session_id,
//                   sentiment: msg.sentiment as 'positive' | 'neutral' | 'negative',
//                 }));
//                 if (onOpenPreviousChat) onOpenPreviousChat(formattedMessages);
//                 setSelectedSessionChat(null);
//               }}
//               className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 rounded-2xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105 text-sm sm:text-base"
//             >
//               Continue This Chat
//             </button>
//             <button
//               onClick={() => setSelectedSessionChat(null)}
//               className="flex-1 bg-gray-100 text-indigo-600 py-3 rounded-2xl font-semibold hover:bg-gray-200 transition-all duration-300 hover:scale-105 text-sm sm:text-base"
//             >
//               Back to History
//             </button>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   // Main History View
//   return (
//     <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
//       <div className="max-w-3xl mx-auto">
//         <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6 sm:mb-8">
//           Your Wellness History
//         </h2>

//         {/* Guest Warning */}
//         {isGuest && (
//           <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-md">
//             <h3 className="font-semibold text-amber-900 mb-2 text-sm sm:text-base">📝 Your history won't be saved</h3>
//             <p className="text-xs sm:text-sm text-amber-800 mb-4">
//               As a guest, your chat history is stored only in your browser and will be lost when you log out. Create an account or log in to save your conversations permanently!
//             </p>
//             {onShowLogin && (
//               <div className="flex gap-3">
//                 <button
//                   onClick={onShowLogin}
//                   className="bg-amber-600 text-white px-4 sm:px-6 py-2 rounded-xl font-semibold hover:bg-amber-700 transition-all text-sm sm:text-base"
//                 >
//                   Log In / Create Account
//                 </button>
//               </div>
//             )}
//           </div>
//         )}

//         {/* View Toggle for authenticated users */}
//         {isAuthenticated && !isGuest && (
//           <div className="flex gap-2 sm:gap-4 mb-6 sm:mb-8 border-b-2 border-gray-200 overflow-x-auto">
//             <button
//               onClick={() => setActiveView('sessions')}
//               className={`py-2 sm:py-3 px-3 sm:px-6 font-semibold transition-all flex items-center gap-2 whitespace-nowrap text-sm sm:text-base ${
//                 activeView === 'sessions'
//                   ? 'text-indigo-600 border-b-2 border-indigo-600'
//                   : 'text-gray-600 hover:text-indigo-600'
//               }`}
//             >
//               <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
//               <span className="hidden sm:inline">Wellness Sessions ({sessions.length})</span>
//               <span className="sm:hidden">Sessions ({sessions.length})</span>
//             </button>
//             <button
//               onClick={() => setActiveView('analytics')}
//               className={`py-2 sm:py-3 px-3 sm:px-6 font-semibold transition-all flex items-center gap-2 whitespace-nowrap text-sm sm:text-base ${
//                 activeView === 'analytics'
//                   ? 'text-indigo-600 border-b-2 border-indigo-600'
//                   : 'text-gray-600 hover:text-indigo-600'
//               }`}
//             >
//               <BarChart className="w-3 h-3 sm:w-4 sm:h-4" />
//               Analytics
//             </button>
//           </div>
//         )}

//         {/* Sessions View */}
//         {activeView === 'sessions' && (
//           <>
//             {loadingSessions ? (
//               <div className="text-center py-16">
//                 <div className="animate-spin inline-block">
//                   <HistoryIcon className="w-12 h-12 text-indigo-600" />
//                 </div>
//                 <p className="text-gray-600 mt-4 text-sm sm:text-base">Loading your wellness sessions...</p>
//               </div>
//             ) : sessions.length === 0 ? (
//               <div className="text-center py-16">
//                 <div className="bg-gradient-to-br from-indigo-100 to-purple-100 p-6 rounded-3xl inline-block mb-6 shadow-lg">
//                   <MessageSquare className="w-12 h-12 sm:w-16 sm:h-16 text-indigo-600" />
//                 </div>
//                 <p className="text-gray-600 text-sm sm:text-base lg:text-lg px-4">No previous wellness sessions. Start a new conversation!</p>
//               </div>
//             ) : (
//               <div className="space-y-4 sm:space-y-5">
//                 {sessions.map((session) => {
//                   const hasMoodEntries = session.mood_entry_count > 0;
//                   const latestMoodEntry = getLatestMoodEntry(session);
//                   const moodDisplay = getMoodDisplay(latestMoodEntry);
                  
//                   return (
//                     <div
//                       key={session.id}
//                       className="bg-white border-2 border-gray-100 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-102 group cursor-pointer"
//                       onClick={() => openChatSession(session)}
//                     >
//                       <div className="flex items-start justify-between mb-4 gap-3">
//                         <div className="flex items-start space-x-3 sm:space-x-4 flex-1 min-w-0">
//                           {/* Mood Icon or Chat Icon */}
//                           <div className={`bg-gradient-to-br ${hasMoodEntries ? 'from-yellow-100 to-orange-100' : 'from-gray-100 to-slate-100'} p-2 sm:p-3 rounded-xl sm:rounded-2xl group-hover:scale-110 transition-transform flex-shrink-0`}>
//                             {hasMoodEntries ? (
//                               <Smile className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
//                             ) : (
//                               <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
//                             )}
//                           </div>
                          
//                           <div className="flex-1 min-w-0">
//                             {/* Session Title */}
//                             <div className="flex flex-wrap items-center gap-2 mb-1">
//                               <h3 className="font-bold text-base sm:text-lg text-gray-800 group-hover:text-indigo-600 transition-colors truncate">
//                                 {hasMoodEntries ? 'Wellness Session' : 'Chat Session'}
//                               </h3>
//                               {hasMoodEntries && (
//                                 <span className="text-xs sm:text-sm font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 flex-shrink-0">
//                                   {session.mood_entry_count} mood check-in{session.mood_entry_count !== 1 ? 's' : ''}
//                                 </span>
//                               )}
//                             </div>
                            
//                             {/* Session Date */}
//                             <div className="text-xs sm:text-sm text-gray-500 font-medium flex items-center gap-1 sm:gap-2 mb-2">
//                               <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
//                               <span className="truncate">{formatDate(session.started_at)}</span>
//                             </div>
                            
//                             {/* Mood Information */}
//                             {hasMoodEntries && (
//                               <div className="mb-3">
//                                 {latestMoodEntry ? (
//                                   <>
//                                     <div className="flex items-center gap-2 mb-2 p-2 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl">
//                                       <span className="text-xl">
//                                         {moodDisplay.emoji}
//                                       </span>
//                                       <div className="flex-1">
//                                         <div className="text-sm font-medium capitalize">
//                                           {moodDisplay.label}
//                                         </div>
//                                         <div className="text-xs text-gray-500">Intensity: {latestMoodEntry.intensity}/10</div>
//                                       </div>
//                                       <div className="text-xs text-gray-400">
//                                         {formatTime(latestMoodEntry.created_at)}
//                                       </div>
//                                     </div>
                                    
//                                     {/* Show ALL individual moods */}
//                                     {moodDisplay.allMoods && moodDisplay.allMoods.length > 1 && (
//                                       <div className="mb-2">
//                                         <div className="text-xs text-gray-600 mb-1">Mood(s):</div>
//                                         <div className="flex flex-wrap gap-1">
//                                           {moodDisplay.allMoods.map((mood, idx) => (
//                                             <span 
//                                               key={idx}
//                                               className="px-1.5 py-0.5 bg-gradient-to-r from-indigo-400 to-purple-400 text-white text-xs rounded-full flex items-center gap-1"
//                                             >
//                                               {getMoodEmoji(mood)} {mood}
//                                             </span>
//                                           ))}
//                                         </div>
//                                       </div>
//                                     )}
                                    
//                                     {/* Note */}
//                                     {latestMoodEntry.note && (
//                                       <p className="text-xs text-gray-600 mt-2 line-clamp-2 break-words bg-gray-50 p-2 rounded">
//                                         "{latestMoodEntry.note}"
//                                       </p>
//                                     )}
                                    
//                                     {/* Show if there are more mood entries */}
//                                     {session.mood_entries && session.mood_entries.length > 1 && (
//                                       <div className="text-xs text-indigo-600 font-medium mt-1">
//                                         +{session.mood_entries.length - 1} earlier mood check-in{session.mood_entries.length - 1 !== 1 ? 's' : ''}
//                                       </div>
//                                     )}
//                                   </>
//                                 ) : (
//                                   <div className="flex items-center justify-between">
//                                     <div className="text-xs text-amber-600 font-medium flex items-center gap-1">
//                                       <Smile className="w-3 h-3" />
//                                       {session.mood_entry_count} mood check-in{session.mood_entry_count !== 1 ? 's' : ''} available
//                                     </div>
//                                     <button
//                                       onClick={(e) => {
//                                         e.stopPropagation();
//                                         loadSessionMoodEntries(session.id, session.session_id);
//                                       }}
//                                       disabled={loadingMoodEntries[session.id]}
//                                       className="text-xs text-indigo-600 font-medium hover:text-indigo-700 px-2 py-1 bg-indigo-50 rounded transition-colors disabled:opacity-50"
//                                     >
//                                       {loadingMoodEntries[session.id] ? 'Loading...' : 'Load'}
//                                     </button>
//                                   </div>
//                                 )}
//                               </div>
//                             )}
                            
//                             {/* Message preview */}
//                             <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs text-gray-400">
//                               <span className="flex items-center gap-1">
//                                 <MessageSquare className="w-3 h-3" />
//                                 {session.message_count} msg{session.message_count !== 1 ? 's' : ''}
//                               </span>
//                               <span className="hidden sm:inline">•</span>
//                               <span className="truncate max-w-[200px] sm:max-w-xs">
//                                 Last: {session.last_message_preview}
//                               </span>
//                             </div>
//                           </div>
//                         </div>
                        
//                         {/* Message count badge */}
//                         <div className="text-right flex-shrink-0">
//                           <div className="text-xs text-gray-600 font-semibold mb-1">Msgs</div>
//                           <div className="font-bold text-xl sm:text-2xl bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
//                             {session.message_count}
//                           </div>
//                         </div>
//                       </div>
                      
//                       {/* Delete Button */}
//                       <div className="mt-3 flex justify-end" onClick={(e) => e.stopPropagation()}>
//                         {showDeleteConfirm === session.id ? (
//                           <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center w-full sm:w-auto">
//                             <span className="text-xs sm:text-sm text-gray-600 text-center sm:text-left sm:mr-2">Delete this session?</span>
//                             <div className="flex gap-2">
//                               <button
//                                 onClick={(e) => handleDeleteSession(session.id, e)}
//                                 disabled={deletingSessionId === session.id}
//                                 className="flex-1 sm:flex-none bg-red-600 text-white px-3 sm:px-4 py-2 rounded-xl font-semibold hover:bg-red-700 transition-all text-xs sm:text-sm disabled:opacity-50"
//                               >
//                                 {deletingSessionId === session.id ? 'Deleting...' : 'Confirm'}
//                               </button>
//                               <button
//                                 onClick={(e) => {
//                                   e.stopPropagation();
//                                   setShowDeleteConfirm(null);
//                                 }}
//                                 className="flex-1 sm:flex-none bg-gray-200 text-gray-800 px-3 sm:px-4 py-2 rounded-xl font-semibold hover:bg-gray-300 transition-all text-xs sm:text-sm"
//                               >
//                                 Cancel
//                               </button>
//                             </div>
//                           </div>
//                         ) : (
//                           <button
//                             onClick={(e) => {
//                               e.stopPropagation();
//                               setShowDeleteConfirm(session.id);
//                             }}
//                             className="flex items-center gap-2 text-red-600 hover:text-red-700 px-3 sm:px-4 py-2 rounded-xl hover:bg-red-50 transition-all font-semibold text-xs sm:text-sm"
//                           >
//                             <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
//                             Delete
//                           </button>
//                         )}
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>
//             )}
//           </>
//         )}

//         {/* Analytics View */}
//         {activeView === 'analytics' && (
//           <div className="space-y-6">
//             {(() => {
//               const stats = moodStatistics();
              
//               return (
//                 <>
//                   {/* Overview Stats */}
//                   <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg">
//                     <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
//                       <BarChart className="w-4 h-4 sm:w-5 sm:h-5" />
//                       Your Wellness Overview
//                     </h3>
                    
//                     <div className="grid grid-cols-3 gap-2 sm:gap-4">
//                       <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center shadow-sm">
//                         <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-indigo-600">{stats.totalSessions}</div>
//                         <div className="text-xs sm:text-sm text-gray-600 mt-1">Total Sessions</div>
//                       </div>
//                       <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center shadow-sm">
//                         <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-purple-600">{stats.totalCheckIns}</div>
//                         <div className="text-xs sm:text-sm text-gray-600 mt-1">Check-ins</div>
//                       </div>
//                       <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center shadow-sm">
//                         <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-pink-600">{stats.averageIntensity}</div>
//                         <div className="text-xs sm:text-sm text-gray-600 mt-1">Avg. Intensity</div>
//                       </div>
//                     </div>
//                   </div>

//                   {/* Mood Distribution */}
//                   {Object.keys(stats.moodDistribution).length > 0 && (
//                     <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg">
//                       <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
//                         <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
//                         Mood Distribution
//                       </h3>
//                       <div className="space-y-3 sm:space-y-4">
//                         {Object.entries(stats.moodDistribution)
//                           .sort((a, b) => b[1] - a[1])
//                           .slice(0, 15) // Show top 15 moods
//                           .map(([mood, count]) => {
//                             const percentage = (count / stats.totalCheckIns) * 100;
//                             return (
//                               <div key={mood} className="flex items-center gap-2 sm:gap-0">
//                                 <div className="w-24 sm:w-32 flex items-center gap-2 sm:gap-3 flex-shrink-0">
//                                   <span className="text-xl sm:text-2xl">{getMoodEmoji(mood)}</span>
//                                   <div className="min-w-0">
//                                     <div className="font-medium capitalize text-xs sm:text-sm truncate">{mood}</div>
//                                     <div className="text-xs text-gray-500">{count} {count !== 1 ? 'times' : 'time'}</div>
//                                   </div>
//                                 </div>
//                                 <div className="flex-1 ml-2 sm:ml-4">
//                                   <div className="h-3 sm:h-4 rounded-full overflow-hidden bg-gray-100">
//                                     <div 
//                                       className={`h-full rounded-full bg-gradient-to-r ${getMoodColor(mood)}`}
//                                       style={{ width: `${Math.min(percentage, 100)}%` }}
//                                     />
//                                   </div>
//                                 </div>
//                                 <div className="ml-2 sm:ml-4 w-12 sm:w-16 text-right font-semibold text-gray-700 text-xs sm:text-sm">
//                                   {percentage.toFixed(1)}%
//                                 </div>
//                               </div>
//                             );
//                           })}
//                       </div>
//                     </div>
//                   )}

//                   {/* No data state */}
//                   {Object.keys(stats.moodDistribution).length === 0 && (
//                     <div className="text-center py-12 bg-white rounded-2xl sm:rounded-3xl shadow-lg">
//                       <BarChart className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
//                       <p className="text-gray-600 mb-2 text-sm sm:text-base px-4">No mood data available yet.</p>
//                       <p className="text-xs sm:text-sm text-gray-500 px-4">Start checking in your mood during chat sessions!</p>
//                     </div>
//                   )}
//                 </>
//               );
//             })()}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }