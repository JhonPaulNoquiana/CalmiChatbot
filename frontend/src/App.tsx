import React, { useState, useRef, useEffect } from 'react';
import { Heart, Sparkles, Bot, Smile, Wind, History as HistoryIcon } from 'lucide-react';
import type { Message, MoodEntry } from './types';
import Chat from './components/Chat';
import Mood from './components/Mood';
import History from './components/History';
import Login from './pages/Login';
import Register from './pages/Register';

function App() {
  // Error state for mood check-in
  const [moodCheckError, setMoodCheckError] = useState<string>('');
  // ...existing state declarations...

  // Authentication state (mock)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!localStorage.getItem('calmi_auth'));
  const [showRegisterPage, setShowRegisterPage] = useState<boolean>(false);
  // Session ID for current chat
  const [sessionId, setSessionId] = useState<string>(() => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeFeature, setActiveFeature] = useState<'chat' | 'mood' | 'history'>('chat');
  const [currentMood, setCurrentMood] = useState<string>('');
  const [moodIntensity, setMoodIntensity] = useState<number>(5);
  const [moodNote, setMoodNote] = useState<string>('');
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);
  const [showMoodCheckin, setShowMoodCheckin] = useState<boolean>(false);
  const [selectedRecord, setSelectedRecord] = useState<MoodEntry | null>(null);
  const [showRecordDetail, setShowRecordDetail] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper to check if mood check-in is allowed for current session
  const canCheckInMood = !moodHistory.some((entry) => entry.sessionId === sessionId);

  // Helper to retrieve chat for a session
  const retrieveChatForSession = (session: string) => {
    setSessionId(session);
    setMessages(messages.filter((msg) => msg.sessionId === session));
    setActiveFeature('chat');
    setShowRecordDetail(false);
  };

  const moodOptions = [
    { emoji: '😊', label: 'Happy', value: 'happy', color: 'from-yellow-100 to-orange-100' },
    { emoji: '😢', label: 'Sad', value: 'sad', color: 'from-blue-100 to-indigo-100' },
    { emoji: '😰', label: 'Anxious', value: 'anxious', color: 'from-purple-100 to-pink-100' },
    { emoji: '😤', label: 'Stressed', value: 'stressed', color: 'from-red-100 to-orange-100' },
    { emoji: '😴', label: 'Tired', value: 'tired', color: 'from-gray-100 to-slate-100' },
    { emoji: '😐', label: 'Neutral', value: 'neutral', color: 'from-green-100 to-teal-100' },
  ];

  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = (): void => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sessionId,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    setTimeout(() => {
      const userSentiment = detectUserSentiment(inputMessage);
      const botMessage: Message = {
        id: Date.now() + 1,
        text: getBotResponse(userSentiment),
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sentiment: userSentiment,
        sessionId,
      };
      setMessages((prev) => [...prev, botMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const submitMoodCheckIn = async (): Promise<void> => {
    if (!currentMood) return;

    // Prevent multiple mood check-ins per session
    if (moodHistory.some((entry) => entry.sessionId === sessionId)) {
      setMoodCheckError('One Mood Check In per chat');
      setShowMoodCheckin(false);
      return;
    }

    const moodEntry: MoodEntry = {
      id: Date.now(),
      mood: currentMood,
      intensity: moodIntensity,
      timestamp: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      note: moodNote,
      sessionId,
    };

    setMoodHistory((prev) => [moodEntry, ...prev]);

    const botMessage: Message = {
      id: Date.now() + 1,
      text: `Thank you for checking in! I've recorded that you're feeling ${currentMood}. Remember, it's okay to feel this way. I'm here whenever you need support. 💙`,
      sender: 'bot',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sentiment: getMoodSentiment(currentMood),
      sessionId,
    };

    setMessages((prev) => [...prev, botMessage]);
    setShowMoodCheckin(false);
    setCurrentMood('');
    setMoodNote('');
    setMoodIntensity(5);
    setActiveFeature('chat');
  };
  // Start a new chat session
  const startNewChat = () => {
    setSessionId(`${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    setMessages([]);
    setCurrentMood('');
    setMoodNote('');
    setMoodIntensity(5);
    setShowMoodCheckin(false);
    setMoodCheckError('');
    setActiveFeature('chat');
  };

  const getMotivationalTip = (): void => {
    const tips = [
      "You're doing better than you think. Every small step counts! 🌟",
      "Take a deep breath. You've overcome challenges before, and you'll do it again. 💪",
      "Your mental health matters. It's okay to take breaks and prioritize yourself. 🌸",
      "Progress, not perfection. You're on the right path! ✨",
      "Remember: This feeling is temporary. Brighter days are ahead! 🌅",
    ];

    const tipMessage: Message = {
      id: Date.now(),
      text: tips[Math.floor(Math.random() * tips.length)],
      sender: 'bot',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sentiment: 'positive',
      sessionId,
    };

    setMessages((prev) => [...prev, tipMessage]);
    setActiveFeature('chat');
  };

  const getMoodEmoji = (mood: string): string => {
    const option = moodOptions.find((m) => m.value === mood);
    return option?.emoji || '😐';
  };

  const getMoodSentiment = (mood: string): 'positive' | 'neutral' | 'negative' => {
    switch (mood) {
      case 'happy':
        return 'positive';
      case 'sad':
      case 'anxious':
      case 'stressed':
        return 'negative';
      case 'tired':
      case 'neutral':
        return 'neutral';
      default:
        return 'neutral';
    }
  };

  const detectUserSentiment = (message: string): 'positive' | 'neutral' | 'negative' => {
    const lowerMessage = message.toLowerCase();
    
    // Negative keywords
    const negativeKeywords = ['sad', 'depressed', 'anxious', 'stressed', 'worried', 'angry', 'frustrated', 'lonely', 'hurt', 'pain', 'bad', 'terrible', 'awful', 'hate', 'scared', 'fear'];
    if (negativeKeywords.some(word => lowerMessage.includes(word))) {
      return 'negative';
    }
    
    // Positive keywords
    const positiveKeywords = ['happy', 'good', 'great', 'amazing', 'wonderful', 'love', 'excited', 'grateful', 'blessed', 'awesome', 'fantastic'];
    if (positiveKeywords.some(word => lowerMessage.includes(word))) {
      return 'positive';
    }
    
    return 'neutral';
  };

  const getBotResponse = (sentiment: 'positive' | 'neutral' | 'negative'): string => {
    const positiveResponses = [
      "That's wonderful to hear! I'm so glad you're feeling this way. Keep spreading that positive energy! 🌟",
      "It sounds like things are going well for you. I'm here to support you and celebrate these moments with you! 💫",
      "Your positive energy is contagious! Thank you for sharing this happiness with me. 🎉",
      "That's amazing! I love hearing about the good things in your life. What else is making you happy?",
    ];
    const negativeResponses = [
      "I hear you, and I can sense what you're going through. You're not alone in this—I'm here to support you. 💙",
      "Thank you for trusting me with how you're feeling. It takes courage to share. Remember, these feelings are temporary, and I'm here for you.",
      "I'm sorry you're struggling right now. Your feelings are valid, and it's okay to feel this way. Let's work through this together. 🤝",
      "That sounds really tough. I want you to know that I care about how you're feeling. Take a moment for yourself—you deserve it.",
    ];
    const neutralResponses = [
      "I hear you, and I'm here to support you. Thank you for sharing. Would you like to talk more about what's on your mind?",
      "I appreciate you sharing that with me. I'm here to listen and support you whenever you need. What else is on your mind?",
      "Thank you for opening up. I'm here to help and understand what you're going through. Feel free to share more whenever you're ready.",
      "I'm listening, and I care about what you're saying. Let's explore this together. What would help you feel better right now?",
    ];
    const responses = {
      positive: positiveResponses,
      negative: negativeResponses,
      neutral: neutralResponses,
    };
    return responses[sentiment][Math.floor(Math.random() * responses[sentiment].length)];
  };
  // ...existing code...
  if (!isAuthenticated) {
    return showRegisterPage ? (
      <Register
        onRegister={(email) => {
          localStorage.setItem('calmi_auth', email);
          setIsAuthenticated(true);
        }}
        onShowLogin={() => setShowRegisterPage(false)}
      />
    ) : (
      <Login
        onLogin={(email) => {
          localStorage.setItem('calmi_auth', email);
          setIsAuthenticated(true);
        }}
        onShowRegister={() => setShowRegisterPage(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-40 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="w-full max-w-6xl h-[85vh] bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl flex relative z-10 border border-white/50">
        <div className="w-80 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-l-3xl p-6 flex flex-col text-white shadow-xl">
          <div className="flex items-center space-x-3 mb-10">
            <div className="bg-white/20 backdrop-blur-lg p-3 rounded-2xl shadow-lg">
              <Heart className="w-7 h-7 text-white" fill="currentColor" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Calmi</h1>
              <p className="text-white/80 text-sm font-medium">Your Wellness Companion</p>
            </div>
          </div>

          <nav className="space-y-3 mb-10 flex-1">
            <button
              onClick={() => setActiveFeature('chat')}
              className={`w-full flex items-center space-x-3 p-4 rounded-2xl text-left transition-all duration-300 ${
                activeFeature === 'chat' ? 'bg-white text-indigo-600 shadow-lg scale-105' : 'text-white hover:bg-white/10 hover:scale-102'
              }`}
            >
              <Bot className="w-5 h-5" />
              <span className="font-semibold">AI Chat</span>
            </button>

            <button
              onClick={() => setActiveFeature('mood')}
              className={`w-full flex items-center space-x-3 p-4 rounded-2xl text-left transition-all duration-300 ${
                activeFeature === 'mood' ? 'bg-white text-indigo-600 shadow-lg scale-105' : 'text-white hover:bg-white/10 hover:scale-102'
              }`}
            >
              <Smile className="w-5 h-5" />
              <span className="font-semibold">Mood Check-in</span>
            </button>

            <button
              onClick={() => setActiveFeature('history')}
              className={`w-full flex items-center space-x-3 p-4 rounded-2xl text-left transition-all duration-300 ${
                activeFeature === 'history' ? 'bg-white text-indigo-600 shadow-lg scale-105' : 'text-white hover:bg-white/10 hover:scale-102'
              }`}
            >
              <HistoryIcon className="w-5 h-5" />
              <span className="font-semibold">History</span>
            </button>
          </nav>

          <div className="space-y-3">
            <button
              onClick={startNewChat}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 rounded-2xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105 mb-2"
            >
              New Chat
            </button>
      {/* Mood check-in error modal */}
      {moodCheckError && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100 animate-scale-in text-center">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
              {moodCheckError}
            </h3>
            <button
              onClick={startNewChat}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 rounded-2xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              New Chat
            </button>
            <button
              onClick={() => setMoodCheckError('')}
              className="w-full mt-3 bg-gray-100 text-indigo-600 py-3 rounded-2xl font-semibold hover:bg-gray-200 transition-all duration-300"
            >
              Close
            </button>
          </div>
        </div>
      )}
            <button
              onClick={getMotivationalTip}
              className="w-full bg-white/20 backdrop-blur-lg text-white py-4 rounded-2xl font-semibold hover:bg-white/30 transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:scale-105"
            >
              <Sparkles className="w-5 h-5" />
              <span>Daily Inspiration</span>
            </button>

            <button
              onClick={() => setShowMoodCheckin(true)}
              className="w-full border-2 border-white/50 text-white py-4 rounded-2xl font-semibold hover:bg-white/10 transition-all duration-300 flex items-center justify-center space-x-2 hover:scale-105"
              disabled={!canCheckInMood}
              style={!canCheckInMood ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >
              <Wind className="w-5 h-5" />
              <span>Quick Check-in</span>
            </button>
            
            <button
              onClick={() => {
                // logout
                localStorage.removeItem('calmi_auth');
                setIsAuthenticated(false);
              }}
              className="w-full mt-4 bg-white/10 text-white py-3 rounded-2xl font-semibold hover:bg-white/20 transition-all duration-300"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-white/50 backdrop-blur-sm rounded-r-3xl">
          {activeFeature === 'chat' && (
            <Chat
              messages={messages.filter((msg) => msg.sessionId === sessionId)}
              isLoading={isLoading}
              inputMessage={inputMessage}
              setInputMessage={setInputMessage}
              sendMessage={sendMessage}
              handleKeyPress={handleKeyPress}
              messagesEndRef={messagesEndRef}
            />
          )}

          {activeFeature === 'mood' && (
            <Mood
              currentMood={currentMood}
              setCurrentMood={setCurrentMood}
              moodIntensity={moodIntensity}
              setMoodIntensity={setMoodIntensity}
              moodNote={moodNote}
              setMoodNote={setMoodNote}
              submitMoodCheckIn={submitMoodCheckIn}
              moodOptions={moodOptions}
              showMoodCheckin={showMoodCheckin}
              setShowMoodCheckin={setShowMoodCheckin}
              renderOnlyModal={false}
            />
          )}

          {activeFeature === 'history' && (
            <History
              moodHistory={moodHistory}
              setSelectedRecord={setSelectedRecord}
              setShowRecordDetail={setShowRecordDetail}
              getMoodEmoji={getMoodEmoji}
              retrieveChatForSession={retrieveChatForSession}
            />
          )}
        </div>
      </div>

      {/* Render quick check-in modal regardless of active tab */}
      {showMoodCheckin && (
        <Mood
          currentMood={currentMood}
          setCurrentMood={setCurrentMood}
          moodIntensity={moodIntensity}
          setMoodIntensity={setMoodIntensity}
          moodNote={moodNote}
          setMoodNote={setMoodNote}
          submitMoodCheckIn={submitMoodCheckIn}
          moodOptions={moodOptions}
          showMoodCheckin={showMoodCheckin}
          setShowMoodCheckin={setShowMoodCheckin}
          renderOnlyModal={true}
        />
      )}

      {/* Render mood record detail modal */}
      {showRecordDetail && selectedRecord && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Mood Details
              </h3>
              <button
                onClick={() => setShowRecordDetail(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl transition-colors"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              <div className="text-center">
                <div className="text-6xl mb-4">{getMoodEmoji(selectedRecord.mood)}</div>
                <div className="font-bold text-2xl text-gray-800 capitalize">{selectedRecord.mood}</div>
                <div className="text-sm text-gray-500 mt-2">{selectedRecord.timestamp}</div>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-5 rounded-2xl border border-indigo-100">
                <div className="text-xs text-gray-600 font-semibold mb-2">Intensity Level</div>
                <div className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  {selectedRecord.intensity}/10
                </div>
              </div>

              {selectedRecord.note && (
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-2xl border border-gray-200">
                  <div className="text-xs text-gray-600 font-semibold mb-2">Notes</div>
                  <div className="text-sm text-gray-800">{selectedRecord.note}</div>
                </div>
              )}

              <button
                onClick={() => retrieveChatForSession(selectedRecord.sessionId)}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 rounded-2xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105"
              >
                Retrieve Chat
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.4s ease-out; }
        @keyframes scale-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-scale-in { animation: scale-in 0.3s ease-out; }
        .hover\\:scale-102:hover { transform: scale(1.02); }
        .hover\\:scale-105:hover { transform: scale(1.05); }
        .hover\\:scale-110:hover { transform: scale(1.10); }
        input[type="range"]::-webkit-slider-thumb { appearance: none; width: 24px; height: 24px; background: linear-gradient(135deg, rgb(99 102 241), rgb(168 85 247)); border-radius: 50%; cursor: pointer; box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4); }
        input[type="range"]::-moz-range-thumb { width: 24px; height: 24px; background: linear-gradient(135deg, rgb(99 102 241), rgb(168 85 247)); border-radius: 50%; cursor: pointer; box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4); border: none; }
      `}</style>
    </div>
  );
}

export default App;