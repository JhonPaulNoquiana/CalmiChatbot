import { useState, useEffect } from 'react';
import type { MoodEntry, Message } from '../types';
import { History as HistoryIcon, MessageSquare, X } from 'lucide-react';
import { getUserSessions, getChatHistory } from '../services/apiService';

interface HistoryProps {
  moodHistory: MoodEntry[];
  setSelectedRecord: (r: MoodEntry | null) => void;
  setShowRecordDetail: (b: boolean) => void;
  getMoodEmoji: (mood: string) => string;
  retrieveChatForSession?: (sessionId: string) => void;
  isAuthenticated?: boolean;
  isGuest?: boolean;
  onOpenPreviousChat?: (messages: Message[]) => void;
  onShowLogin?: () => void;
}

interface ChatSession {
  id: number;
  session_id: string;
  is_guest: boolean;
  started_at: string;
  message_count: number;
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

export default function History({ moodHistory, setSelectedRecord, setShowRecordDetail, getMoodEmoji, retrieveChatForSession, isAuthenticated, isGuest, onOpenPreviousChat, onShowLogin }: HistoryProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [activeTab, setActiveTab] = useState<'mood' | 'chats'>('mood');
  const [sessionMessages, setSessionMessages] = useState<Record<number, ChatMessage[]>>({});
  const [selectedSessionChat, setSelectedSessionChat] = useState<ChatSession | null>(null);
  const [loadingChat, setLoadingChat] = useState(false);

  // Load chat sessions for authenticated users
  useEffect(() => {
    if (isAuthenticated && !isGuest) {
      loadSessions();
    }
  }, [isAuthenticated, isGuest]);

  const loadSessions = async () => {
    try {
      setLoadingSessions(true);
      const data = await getUserSessions();
      setSessions(data.sessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadSessionMessages = async (sessionId: number) => {
    if (sessionMessages[sessionId]) return; // Already loaded
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

  const openChatSession = async (session: ChatSession) => {
    setSelectedSessionChat(session);
    if (!sessionMessages[session.id]) {
      await loadSessionMessages(session.id);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // If viewing a chat session, show the full conversation
  if (selectedSessionChat) {
    const messages = sessionMessages[selectedSessionChat.id] || [];
    return (
      <div className="flex-1 p-8 overflow-y-auto flex flex-col">
        <div className="max-w-3xl mx-auto w-full flex-1">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 bg-white rounded-2xl p-4 shadow-md sticky top-0">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Chat Session</h2>
              <p className="text-sm text-gray-500">{formatDate(selectedSessionChat.started_at)}</p>
            </div>
            <button
              onClick={() => setSelectedSessionChat(null)}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          {/* Messages */}
          {loadingChat ? (
            <div className="text-center py-8">
              <div className="animate-spin inline-block">
                <MessageSquare className="w-8 h-8 text-indigo-600" />
              </div>
              <p className="text-gray-600 mt-2">Loading conversation...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-600">No messages in this session</p>
            </div>
          ) : (
            <div className="space-y-4 mb-6">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-4 py-3 rounded-2xl ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <p className="text-sm">{msg.text}</p>
                    <p className="text-xs mt-2 opacity-70">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Continue Chat Button */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => {
                // Convert to Message format for App.tsx
                const formattedMessages: Message[] = messages.map(msg => ({
                  id: msg.id,
                  text: msg.text,
                  sender: msg.sender as 'user' | 'bot',
                  timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  sessionId: selectedSessionChat.session_id,
                  sentiment: msg.sentiment as 'positive' | 'neutral' | 'negative',
                }));
                if (onOpenPreviousChat) onOpenPreviousChat(formattedMessages);
                setSelectedSessionChat(null);
              }}
              className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 rounded-2xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              Continue This Chat
            </button>
            <button
              onClick={() => setSelectedSessionChat(null)}
              className="flex-1 bg-gray-100 text-indigo-600 py-3 rounded-2xl font-semibold hover:bg-gray-200 transition-all duration-300 hover:scale-105"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-8">
          Your Wellness History
        </h2>

        {/* Guest Warning */}
        {isGuest && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 mb-8 shadow-md">
            <h3 className="font-semibold text-amber-900 mb-2">📝 Your history won't be saved</h3>
            <p className="text-sm text-amber-800 mb-4">
              As a guest, your chat history is stored only in your browser and will be lost when you log out. Create an account or log in to save your conversations permanently!
            </p>
            {onShowLogin && (
              <div className="flex gap-3">
                <button
                  onClick={onShowLogin}
                  className="bg-amber-600 text-white px-6 py-2 rounded-xl font-semibold hover:bg-amber-700 transition-all"
                >
                  Log In / Create Account
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tabs for authenticated users */}
        {isAuthenticated && !isGuest && (
          <div className="flex gap-4 mb-8 border-b-2 border-gray-200">
            <button
              onClick={() => setActiveTab('mood')}
              className={`py-3 px-6 font-semibold transition-all ${
                activeTab === 'mood'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-indigo-600'
              }`}
            >
              Mood Check-ins ({moodHistory.length})
            </button>
            <button
              onClick={() => setActiveTab('chats')}
              className={`py-3 px-6 font-semibold transition-all ${
                activeTab === 'chats'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-indigo-600'
              }`}
            >
              Chat Sessions ({sessions.length})
            </button>
          </div>
        )}

        {/* Mood History Tab */}
        {activeTab === 'mood' && (
          <>
            {moodHistory.length === 0 ? (
              <div className="text-center py-16">
                <div className="bg-gradient-to-br from-indigo-100 to-purple-100 p-6 rounded-3xl inline-block mb-6 shadow-lg">
                  <HistoryIcon className="w-16 h-16 text-indigo-600" />
                </div>
                <p className="text-gray-600 text-lg">No mood check-ins yet. Start tracking your wellness!</p>
              </div>
            ) : (
              <div className="space-y-5">
                {moodHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-white border-2 border-gray-100 rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-102 group"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="text-5xl transform group-hover:scale-110 transition-transform duration-300">{getMoodEmoji(entry.mood)}</div>
                        <div>
                          <div className="font-bold text-xl text-gray-800 capitalize">{entry.mood}</div>
                          <div className="text-sm text-gray-500 font-medium">{entry.timestamp}</div>
                        </div>
                      </div>
                      <div className="text-right bg-gradient-to-br from-indigo-50 to-purple-50 px-5 py-3 rounded-2xl">
                        <div className="text-xs text-gray-600 font-semibold mb-1">Intensity</div>
                        <div className="font-bold text-2xl bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{entry.intensity}/10</div>
                      </div>
                    </div>
                    {entry.note && (
                      <div className="text-sm text-gray-700 bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-2xl border border-gray-200">{entry.note}</div>
                    )}
                    <div className="mt-3 flex gap-2">
                      {retrieveChatForSession && !isGuest && (
                        <button
                          className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 py-2 rounded-2xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105"
                          onClick={() => retrieveChatForSession(entry.sessionId)}
                        >
                          Retrieve Chat
                        </button>
                      )}
                      <button
                        className="bg-gray-100 text-indigo-600 px-4 py-2 rounded-2xl font-semibold hover:bg-gray-200 transition-all duration-300 hover:scale-105"
                        onClick={() => {
                          setSelectedRecord(entry);
                          setShowRecordDetail(true);
                        }}
                      >
                        Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Chat Sessions Tab */}
        {activeTab === 'chats' && (
          <>
            {loadingSessions ? (
              <div className="text-center py-16">
                <div className="animate-spin">
                  <HistoryIcon className="w-12 h-12 text-indigo-600" />
                </div>
                <p className="text-gray-600 mt-4">Loading your chat sessions...</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-16">
                <div className="bg-gradient-to-br from-indigo-100 to-purple-100 p-6 rounded-3xl inline-block mb-6 shadow-lg">
                  <MessageSquare className="w-16 h-16 text-indigo-600" />
                </div>
                <p className="text-gray-600 text-lg">No previous chat sessions. Start a new conversation!</p>
              </div>
            ) : (
              <div className="space-y-5">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="bg-white border-2 border-gray-100 rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-102 group cursor-pointer"
                    onClick={() => openChatSession(session)}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="bg-gradient-to-br from-indigo-100 to-purple-100 p-3 rounded-2xl group-hover:scale-110 transition-transform">
                          <MessageSquare className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                          <div className="font-bold text-lg text-gray-800 group-hover:text-indigo-600 transition-colors">Chat Session</div>
                          <div className="text-sm text-gray-500 font-medium">{formatDate(session.started_at)}</div>
                        </div>
                      </div>
                      <div className="text-right bg-gradient-to-br from-indigo-50 to-purple-50 px-5 py-3 rounded-2xl">
                        <div className="text-xs text-gray-600 font-semibold mb-1">Messages</div>
                        <div className="font-bold text-2xl bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{session.message_count}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
