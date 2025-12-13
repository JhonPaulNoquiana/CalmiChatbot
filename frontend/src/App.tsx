import React, { useState, useRef, useEffect } from 'react';
import { Heart, Sparkles, Bot, Smile, Wind, History as HistoryIcon, Menu, X } from 'lucide-react';
import type { Message, MoodEntry } from './types';
import Chat from './components/Chat';
import Mood from './components/Mood';
import History from './components/History';
import Login from './pages/Login';
import Register from './pages/Register';
import Landing from './pages/Landing';
import ForgotPassword from './pages/ForgotPassword';
import { sendChatMessage } from './services/apiService';
import { submitMoodCheckIn as apiSubmitMoodCheckIn } from './services/apiService';
import { getUserMoodHistory } from './services/apiService';

function App() {
  const [showForgotPassword, setShowForgotPassword] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!localStorage.getItem('calmi_token'));
  const [showRegisterPage, setShowRegisterPage] = useState<boolean>(false);
  const [showLoginPage, setShowLoginPage] = useState<boolean>(false);
  const [isGuest, setIsGuest] = useState<boolean>(() => localStorage.getItem('calmi_guest') === 'true');
  // Removed unused userId state variable
  const [userName, setUserName] = useState<string>(() => {
    const user = localStorage.getItem('calmi_user');
    return user ? JSON.parse(user).full_name || '' : '';
  });

  // Mobile sidebar toggle
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  const [inspirationClicks, setInspirationClicks] = useState<number>(0);
  const [loginFromHistory, setLoginFromHistory] = useState<boolean>(false);

  const [sessionId, setSessionId] = useState<string>(() => {
    return localStorage.getItem('calmi_session') || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeFeature, setActiveFeature] = useState<'chat' | 'mood' | 'history'>('chat');
  const [currentMood, setCurrentMood] = useState<string>('');
  const [moodIntensity, setMoodIntensity] = useState<number>(5);
  const [moodNote, setMoodNote] = useState<string>('');
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);
  const [showMoodCheckin, setShowMoodCheckin] = useState<boolean>(false);
  const [selectedRecord] = useState<MoodEntry | null>(null);
  const [showRecordDetail, setShowRecordDetail] = useState<boolean>(false);
  const [moodCheckError, setMoodCheckError] = useState<string>('');
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // REMOVED: canCheckInMood check - users can always check in their mood
  // const canCheckInMood = !moodHistory.some((entry) => entry.sessionId === sessionId);

  useEffect(() => {
    if (isGuest) {
      localStorage.setItem('calmi_guest', 'true');
      localStorage.setItem('calmi_session', sessionId);
    } else {
      localStorage.removeItem('calmi_guest');
      localStorage.removeItem('calmi_session');
    }
  }, [isGuest, sessionId]);

  const retrieveChatForSession = (session: string) => {
    setSessionId(session);
    setMessages(messages.filter((msg) => msg.sessionId === session));
    setActiveFeature('chat');
    setShowRecordDetail(false);
    setIsMobileSidebarOpen(false);
  };

  const handleOpenPreviousChat = (previousMessages: Message[]) => {
    const sessionId = previousMessages.length > 0 ? previousMessages[0].sessionId : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(sessionId);
    setMessages(previousMessages);
    setActiveFeature('chat');
    setIsMobileSidebarOpen(false);
  };

const moodOptions = [
  { emoji: '😊', label: 'Happy', value: 'happy', color: 'from-yellow-100 to-orange-100' },
  { emoji: '😢', label: 'Sad', value: 'sad', color: 'from-blue-100 to-indigo-100' },
  { emoji: '😰', label: 'Anxious', value: 'anxious', color: 'from-purple-100 to-pink-100' },
  { emoji: '😔', label: 'Lonely', value: 'lonely', color: 'from-indigo-100 to-gray-100' }, 
  { emoji: '😡', label: 'Angry', value: 'angry', color: 'from-red-100 to-rose-100' },
  { emoji: '😤', label: 'Stressed', value: 'stressed', color: 'from-orange-100 to-red-100' },
  { emoji: '😴', label: 'Tired', value: 'tired', color: 'from-gray-100 to-slate-100' },
  { emoji: '😐', label: 'Neutral', value: 'neutral', color: 'from-green-100 to-teal-100' },
];
  
  useEffect(() => {
  const loadMoodHistory = async () => {
    if (isAuthenticated && !isGuest) {
      try {
        console.log('📊 Loading mood history from database...');
        const data = await getUserMoodHistory();
        
        // Convert backend format to frontend MoodEntry format
        const formattedHistory: MoodEntry[] = data.mood_history.map((entry: any) => ({
          id: entry.id,
          mood: entry.mood,
          intensity: entry.intensity,
          timestamp: new Date(entry.created_at).toLocaleString([], { 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          note: entry.note || '',
          sessionId: entry.session_id_string || String(entry.session_id),
          emotions: entry.emotions ? (typeof entry.emotions === 'string' ? 
                   entry.emotions.split(',').filter((e: string) => e.trim()) : 
                   entry.emotions) : [],
        }));
        
        setMoodHistory(formattedHistory);
        console.log('✅ Loaded mood history:', formattedHistory.length, 'entries');
      } catch (error) {
        console.error('❌ Failed to load mood history:', error);
      }
    }
  };

  loadMoodHistory();
}, [isAuthenticated, isGuest]);

  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isAuthenticated && messages.length === 0) {
      setTimeout(() => {
        const welcomeMsg: Message = {
          id: Date.now(),
          text: isGuest 
            ? "Hi there! I'm Calmi, your AI mental wellness companion 🌸\nHow are you feeling today?"
            : `Welcome ${userName}! 💙\n\nI'm Calmi, your empathetic AI companion created to support you through stress, anxiety, and emotional challenges. How are you feeling today?`,
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sessionId,
        };
        setMessages([welcomeMsg]);
      }, 300);
    }
  }, [isAuthenticated, userName, sessionId, isGuest, messages.length]);

  const sendMessage = async (): Promise<void> => {
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

    try {
      console.log('🚀 Attempting to call backend API...');
      const response = await sendChatMessage(sessionId, inputMessage);
      
      console.log('✅ API call successful, response:', response);
      
      const botMessage: Message = {
        id: Date.now() + 1,
        text: response.message || "I hear you. Thank you for sharing that with me.",
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sentiment: response.sentiment || 'neutral',
        sessionId,
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error('API call failed, using fallback response. Error:', error);
      
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const submitMoodCheckIn = async (): Promise<void> => {
    if (!currentMood) return;

    try {
      const response = await apiSubmitMoodCheckIn(
        sessionId,
        currentMood,
        moodIntensity,
        moodNote,
        selectedEmotions
      );

      console.log('✅ Mood check-in saved:', response);

      // Create local mood entry for immediate UI update
      const moodEntry: MoodEntry = {
        id: response.mood_entry.id,
        mood: currentMood,
        intensity: moodIntensity,
        timestamp: new Date().toLocaleString([], { 
          month: 'short', 
          day: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        note: moodNote,
        sessionId,
        emotions: selectedEmotions,
      };

      // Always add to mood history (multiple entries allowed)
      setMoodHistory((prev) => [moodEntry, ...prev]);

      // Send confirmation bot message
      const botMessage: Message = {
        id: Date.now() + 1,
        text: `Thank you for checking in! I've recorded that you're feeling ${currentMood}. ${
          selectedEmotions.length > 0 ? `I notice you're also feeling ${selectedEmotions.join(', ')}. ` : ''
        }Remember, it's okay to feel this way. I'm here whenever you need support. 💙`,
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sentiment: getMoodSentiment(currentMood),
        sessionId,
      };

      setMessages((prev) => [...prev, botMessage]);
      
      // Reset form
      setShowMoodCheckin(false);
      setCurrentMood('');
      setMoodNote('');
      setMoodIntensity(5);
      setSelectedEmotions([]);
      setActiveFeature('chat');
      setIsMobileSidebarOpen(false);
      
    } catch (error: any) {
      console.error('Failed to save mood check-in:', error);
      
      // Show error to user
      setMoodCheckError(error.message || 'Failed to save mood check-in. Please try again.');
      setShowMoodCheckin(false);
    }
  };

  const startNewChat = () => {
    const newSessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
    setMessages([]);
    setCurrentMood('');
    setMoodNote('');
    setMoodIntensity(5);
    setSelectedEmotions([]);
    setShowMoodCheckin(false);
    setMoodCheckError('');
    setInspirationClicks(0);
    setActiveFeature('chat');
    setIsMobileSidebarOpen(false);

    if (isGuest) {
      localStorage.setItem('calmi_session', newSessionId);
    }
  };

  const getMotivationalTip = (): void => {
    if (inspirationClicks >= 5) {
      const limitMessage: Message = {
        id: Date.now(),
        text: "You've had a lot of inspiration today! Focus on taking action on what resonates with you. I'm here if you need more support later. 💙",
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sentiment: 'positive',
        sessionId,
      };
      setMessages((prev) => [...prev, limitMessage]);
      setActiveFeature('chat');
      setIsMobileSidebarOpen(false);
      return;
    }

    const tips = [
      "You're doing better than you think. Every small step counts! 🌟",
      "Take a deep breath. You've overcome challenges before, and you'll do it again. 💪",
      "Your mental health matters. It's okay to take breaks and prioritize yourself. 🌸",
      "Progress, not perfection. You're on the right path! ✨",
      "Remember: This feeling is temporary. Brighter days are ahead! 🌅",
      "Be kind to yourself today. You're doing the best you can. 💙",
      "Your struggles don't define you. Your resilience does. 🦋",
      "Healing isn't linear. Every day is a new opportunity to grow. 🌱",
      "You deserve rest, joy, and all the good things in life. 🎉",
      "Your past doesn't predict your future. You have the power to change. ⚡",
      "You're never alone in this journey. Reach out to someone you trust. 🤝",
      "Vulnerability is strength. Sharing your feelings takes courage. 💬",
      "You matter more than you realize to the people around you. 💕",
      "Asking for help is a sign of wisdom, not weakness. 🌟",
      "Connection heals. Let people in today. 🏡",
      "Every challenge is an opportunity to learn more about yourself. 📚",
      "You're capable of more than you've ever tried. Believe in yourself! 🚀",
      "Growth happens outside your comfort zone. You've got this! 🌈",
      "Your struggles are not obstacles; they're stepping stones. 🪜",
      "The strongest people are those who ask for help. You're strong. 💪",
      "Find something small to be grateful for today. It changes everything. 🙏",
      "Joy is waiting for you. Sometimes you just need to pause and notice it. 🌻",
      "Celebrate the small wins. They matter more than you think. 🎊",
      "Your smile has more power than you know. Share it with the world. 😊",
      "Life is full of beautiful moments. Take time to appreciate them. 📸",
      "I am worthy of love, happiness, and success. ✨",
      "I choose to focus on what I can control today. 🎯",
      "My challenges are temporary; my strength is permanent. 💎",
      "I am becoming the best version of myself. 🌟",
      "Today, I choose peace over worry. 🕊️",
      "Better days are coming. Hold on just a little longer. 🌙",
      "Your story isn't over yet. The best is yet to come. 📖",
      "You are braver than you believe, stronger than you seem, and smarter than you think. 🧠",
      "The world needs your unique light. Shine bright! ⭐",
      "You've survived 100% of your worst days. You're undefeated. 🏆",
      "Take a moment to breathe. Your nervous system will thank you. 🧘",
      "Boundaries are not selfish; they're necessary. It's okay to say no. 🚧",
      "Your body and mind deserve rest. Give yourself permission to relax. 😴",
      "Nourish yourself with kindness, healthy food, and good company. 🍎",
      "You don't have to earn the right to take care of yourself. Do it anyway. 💅",
      "You are here for a reason. Your existence has value. 🌍",
      "What brings you joy today? Make time for it. 🎨",
      "Your unique perspective is needed in this world. 👁️",
      "Follow your heart; it knows the way. 💓",
      "Purpose is found in the pursuit of what makes you feel alive. 🔥",
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
    setInspirationClicks((prev) => prev + 1);
    setActiveFeature('chat');
    setIsMobileSidebarOpen(false);
  };

  const getMoodEmoji = (mood: string): string => {
    const option = moodOptions.find((m) => m.value === mood);
    return option?.emoji || '😐';
  };

const getMoodSentiment = (mood: string): 'positive' | 'neutral' | 'negative' => {
  switch (mood) {
    case 'happy': return 'positive';
    case 'sad': 
    case 'anxious':
    case 'lonely':
    case 'stressed': 
        case 'tired': 
    case 'angry': return 'negative';
    case 'neutral': return 'neutral';
    default: return 'neutral';
  }
};

  const detectUserSentiment = (message: string): 'positive' | 'neutral' | 'negative' => {
    const lowerMessage = message.toLowerCase();
    const negativeKeywords = ['sad', 'depressed', 'anxious', 'stressed', 'worried', 'tired', 'angry', 'frustrated', 'lonely', 'hurt', 'pain', 'bad', 'terrible', 'awful', 'hate', 'scared', 'fear'];
    if (negativeKeywords.some(word => lowerMessage.includes(word))) return 'negative';
    
    const positiveKeywords = ['happy', 'good', 'great', 'amazing', 'wonderful', 'love', 'excited', 'grateful', 'blessed', 'awesome', 'fantastic'];
    if (positiveKeywords.some(word => lowerMessage.includes(word))) return 'positive';
    
    return 'neutral';
  };

  const getBotResponse = (sentiment: 'positive' | 'neutral' | 'negative'): string => {
    const responses = {
      positive: [
        "That's wonderful to hear! I'm so glad you're feeling this way. Keep spreading that positive energy! 🌟",
        "It sounds like things are going well for you. I'm here to support you and celebrate these moments with you! 💫",
        "Your positive energy is contagious! Thank you for sharing this happiness with me. 🎉",
        "That's amazing! I love hearing about the good things in your life. What else is making you happy?",
      ],
      negative: [
        "I hear you, and I can sense what you're going through. You're not alone in this—I'm here to support you. 💙",
        "Thank you for trusting me with how you're feeling. It takes courage to share. Remember, these feelings are temporary, and I'm here for you.",
        "I'm sorry you're struggling right now. Your feelings are valid, and it's okay to feel this way. Let's work through this together. 🤝",
        "That sounds really tough. I want you to know that I care about how you're feeling. Take a moment for yourself—you deserve it.",
      ],
      neutral: [
        "I hear you, and I'm here to support you. Thank you for sharing. Would you like to talk more about what's on your mind?",
        "I appreciate you sharing that with me. I'm here to listen and support you whenever you need. What else is on your mind?",
        "Thank you for opening up. I'm here to help and understand what you're going through. Feel free to share more whenever you're ready.",
        "I'm listening, and I care about what you're saying. Let's explore this together. What would help you feel better right now?",
      ],
    };
    return responses[sentiment][Math.floor(Math.random() * responses[sentiment].length)];
  };


  const handleLoginAsGuest = () => {
    setIsAuthenticated(true);
    setIsGuest(true);
    setLoginFromHistory(false);
    
    setTimeout(() => {
      const welcomeMsg: Message = {
        id: Date.now(),
        text: "Hi there! I'm Calmi, your AI mental wellness companion 🌸\nHow are you feeling today?",
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sessionId,
      };
      setMessages([welcomeMsg]);
    }, 300);
  };

  if (!isAuthenticated && showForgotPassword) {
    return (
      <ForgotPassword
        onBackToLogin={() => {
          setShowForgotPassword(false);
          setShowLoginPage(true);
        }}
        onSuccess={() => {
          setShowForgotPassword(false);
          setShowLoginPage(true);
        }}
      />
    );
  }

  if (!isAuthenticated && showLoginPage) {
    return (
      <Login
        onLogin={(_email, _token, _userId, userName) => {
          setIsAuthenticated(true);
          setIsGuest(false);
          setUserName(userName);
          
          if (!loginFromHistory) {
            const newSessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            setSessionId(newSessionId);
            setMessages([]);
          }
          
          setLoginFromHistory(false);
          setShowLoginPage(false);
        }}
        onShowRegister={() => {
          setShowLoginPage(false);
          setShowRegisterPage(true);
        }}
        onBackToLanding={() => {
          setShowLoginPage(false);
          setShowRegisterPage(false);
        }}
        onShowForgotPassword={() => {
          setShowForgotPassword(true);
          setShowLoginPage(false);
        }}
      />
    );
  }

  if (!isAuthenticated && showRegisterPage) {
    return (
      <Register
        onRegister={(_email, _token, _userId, userName) => {
          setIsAuthenticated(true);
          setIsGuest(false);
          setUserName(userName);
          
          const newSessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          setSessionId(newSessionId);
          setMessages([]);
          
          setShowRegisterPage(false);
        }}
        onShowLogin={() => {
          setShowRegisterPage(false);
          setShowLoginPage(true);
        }}
        onBackToLanding={() => {
          setShowRegisterPage(false);
          setShowLoginPage(false);
        }}
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <Landing
        onLoginAsGuest={handleLoginAsGuest}
        onNavigateToRegister={() => setShowRegisterPage(true)}
        onNavigateToLogin={() => setShowLoginPage(true)}
      />
    );
  }

  return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-2 sm:p-4 relative overflow-hidden">
    {/* Enhanced Background blobs with subtle pattern */}
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-20 left-20 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-25 animate-blob"></div>
      <div className="absolute top-40 right-20 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-25 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-40 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-25 animate-blob animation-delay-4000"></div>
      {/* Subtle grid pattern overlay */}
      <div className="absolute inset-0 bg-grid-white/5"></div>
    </div>

    <div className="w-full max-w-6xl h-[90dvh] sm:h-[85vh] bg-white/85 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl flex relative z-10 border border-white/60 overflow-hidden">
      {/* Mobile Header with Menu Button - Enhanced gradient */}
      <div className="lg:hidden absolute top-0 left-0 right-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-600 p-4 flex items-center justify-between z-20 rounded-t-2xl shadow-lg">
        <div className="flex items-center space-x-2">
          <div className="bg-white/25 backdrop-blur-lg p-2 rounded-xl shadow-lg ring-1 ring-white/30">
            <Heart className="w-5 h-5 text-white" fill="currentColor" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white drop-shadow-md">{isGuest ? 'Calmi (Guest)' : 'Calmi'}</h1>
            <p className="text-white/85 text-xs font-medium drop-shadow-sm">Your Wellness Companion</p>
          </div>
        </div>
        <button
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="bg-white/25 backdrop-blur-lg p-2 rounded-xl text-white hover:bg-white/35 active:scale-95 transition-all duration-200 ring-1 ring-white/30"
        >
          {isMobileSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar - Desktop always visible, Mobile overlay */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-30 w-80 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-600 
        lg:rounded-l-3xl p-6 flex flex-col text-white shadow-2xl transition-all duration-300 ease-out
        ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/*Desktop Header - Enhanced */}
        {/* Added a light, non-functional comment here for change detection */}
        <div className="hidden lg:flex items-center space-x-3 mb-10">
          <div className="bg-white/25 backdrop-blur-lg p-3 rounded-2xl shadow-lg ring-1 ring-white/30">
            <Heart className="w-7 h-7 text-white" fill="currentColor" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight drop-shadow-lg">{isGuest ? 'Calmi (Guest)' : 'Calmi'}</h1>
            <p className="text-white/85 text-sm font-medium drop-shadow-sm">Your Wellness Companion</p>
          </div>
        </div>

        {/* Mobile close button */}
        <div className="lg:hidden flex justify-end mb-4">
          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="bg-white/25 backdrop-blur-lg p-2 rounded-xl hover:bg-white/35 active:scale-95 transition-all duration-200 ring-1 ring-white/30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="space-y-4 mb-10 flex-1"> {/* Changed 'space-y-3' to 'space-y-4' */}
          <button
            onClick={() => {
              setActiveFeature('chat');
              setIsMobileSidebarOpen(false);
            }}
            className={`group w-full flex items-center space-x-3 p-4 rounded-2xl text-left transition-all duration-300 hover:shadow-lg ${
              activeFeature === 'chat' 
                ? 'bg-white text-indigo-600 shadow-xl scale-105 ring-2 ring-indigo-200/50' 
                : 'text-white hover:bg-white/15 hover:scale-[1.02] hover:shadow-md'
            }`}
          >
            <Bot className="w-5 h-5 flex-shrink-0" />
            <span className="font-semibold group-hover:translate-x-1 transition-transform">AI Chat</span>
          </button>

          <button
            onClick={() => {
              setActiveFeature('mood');
              setIsMobileSidebarOpen(false);
            }}
            className={`group w-full flex items-center space-x-3 p-4 rounded-2xl text-left transition-all duration-300 hover:shadow-lg ${
              activeFeature === 'mood' 
                ? 'bg-white text-indigo-600 shadow-xl scale-105 ring-2 ring-indigo-200/50' 
                : 'text-white hover:bg-white/15 hover:scale-[1.02] hover:shadow-md'
            }`}
          >
            <Smile className="w-5 h-5 flex-shrink-0" />
            <span className="font-semibold group-hover:translate-x-1 transition-transform">Mood Check-in</span>
          </button>

          <button
            onClick={() => {
              setActiveFeature('history');
              setIsMobileSidebarOpen(false);
            }}
            className={`group w-full flex items-center space-x-3 p-4 rounded-2xl text-left transition-all duration-300 hover:shadow-lg ${
              activeFeature === 'history' 
                ? 'bg-white text-indigo-600 shadow-xl scale-105 ring-2 ring-indigo-200/50' 
                : 'text-white hover:bg-white/15 hover:scale-[1.02] hover:shadow-md'
            }`}
          >
            <HistoryIcon className="w-5 h-5 flex-shrink-0" />
            <span className="font-semibold group-hover:translate-x-1 transition-transform">History</span>
          </button>
        </nav>

        <div className="space-y-3">
          <button
            onClick={startNewChat}
            className="w-full bg-gradient-to-r from-indigo-400 to-purple-600 text-white py-3 rounded-2xl font-semibold hover:shadow-xl active:scale-95 transition-all duration-300 hover:scale-105 mb-2 ring-1 ring-white/30"
          >
            New Chat
          </button>

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
                  className="w-full mt-3 bg-gray-100 text-indigo-600 py-3 rounded-2xl font-semibold hover:bg-gray-200 active:scale-95 transition-all duration-300"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          <button
            onClick={getMotivationalTip}
            className="w-full bg-white/25 backdrop-blur-lg text-white py-3 sm:py-4 rounded-2xl font-semibold hover:bg-white/40 active:scale-95 transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:scale-105 text-sm sm:text-base ring-1 ring-white/30"
          >
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="truncate">Daily Inspiration {inspirationClicks < 5 ? `(${5 - inspirationClicks})` : '(Max)'}</span>
          </button>

          <button
            onClick={() => {
              setShowMoodCheckin(true);
              setIsMobileSidebarOpen(false);
            }}
            className="w-full border-2 border-white/60 text-white py-3 sm:py-4 rounded-2xl font-semibold hover:bg-white/15 active:scale-95 transition-all duration-300 flex items-center justify-center space-x-2 hover:scale-105 text-sm sm:text-base ring-1 ring-white/30"
            // REMOVED: disabled={!canCheckInMood}
            // style={!canCheckInMood ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
          >
            <Wind className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Quick Check-in</span>
          </button>

          <button
            onClick={() => {
              localStorage.removeItem('calmi_token');
              localStorage.removeItem('calmi_user');
              localStorage.removeItem('calmi_guest');
              localStorage.removeItem('calmi_session');
              localStorage.removeItem('calmi_messages');
              
              setIsAuthenticated(false);
              setIsGuest(false);
              setUserName("");
              setMessages([]);
              setLoginFromHistory(false);
              setIsMobileSidebarOpen(false);
              
              setTimeout(() => {
                setShowLoginPage(false);
                setShowRegisterPage(false);
              }, 500);
            }}
            className="w-full mt-4 bg-white/15 text-white py-3 rounded-2xl font-semibold hover:bg-white/30 active:scale-95 transition-all duration-300 ring-1 ring-white/30"
          >
            {isGuest ? 'Exit Guest Mode' : 'Logout'}
          </button>
        </div>
      </div>

      {/*Mobile Sidebar Overlay*/}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col bg-white/60 backdrop-blur-sm rounded-r-2xl sm:rounded-r-3xl mt-16 lg:mt-0 border-l border-white/30">
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
            selectedEmotions={selectedEmotions}
            setSelectedEmotions={setSelectedEmotions}
          />
        )}

        {activeFeature === 'history' && (
          <History
            getMoodEmoji={getMoodEmoji}
            isAuthenticated={isAuthenticated}
            isGuest={isGuest}
            onOpenPreviousChat={handleOpenPreviousChat}
            onShowLogin={() => {
              // Logout guest first
              localStorage.removeItem('calmi_token');
              localStorage.removeItem('calmi_user');
              localStorage.removeItem('calmi_guest');
              localStorage.removeItem('calmi_session');
              
              // Reset states
              setIsAuthenticated(false);
              setIsGuest(false);
              setUserName("");
              setMessages([]);
              
              // Show login page
              setShowLoginPage(true);
            }}
          />
        )}
      </div>
    </div>

    {/* Render quick check-in modal */}
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
        selectedEmotions={selectedEmotions}
        setSelectedEmotions={setSelectedEmotions}
      />
    )}

    {/* Render mood record detail modal - Enhanced */}
    {showRecordDetail && selectedRecord && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-gray-100 animate-scale-in">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Mood Details
            </h3>
            <button
              onClick={() => setShowRecordDetail(false)}
              className="text-gray-400 hover:text-gray-600 text-2xl transition-all duration-200 hover:scale-110"
            >
              ×
            </button>
          </div>

          <div className="space-y-6">
            <div className="text-center">
              <div className="text-5xl sm:text-6xl mb-4">{getMoodEmoji(selectedRecord.mood)}</div>
              <div className="font-bold text-xl sm:text-2xl text-gray-800 capitalize">{selectedRecord.mood}</div>
              <div className="text-sm text-gray-500 mt-2">{selectedRecord.timestamp}</div>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-5 rounded-2xl border border-indigo-100 shadow-sm">
              <div className="text-xs text-gray-600 font-semibold mb-2">Intensity Level</div>
              <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                {selectedRecord.intensity}/10
              </div>
            </div>

            {selectedRecord.note && (
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-2xl border border-gray-200 shadow-sm">
                <div className="text-xs text-gray-600 font-semibold mb-2">Notes</div>
                <div className="text-sm text-gray-800 leading-relaxed">{selectedRecord.note}</div>
              </div>
            )}

            <button
              onClick={() => retrieveChatForSession(selectedRecord.sessionId)}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 rounded-2xl font-semibold hover:shadow-xl active:scale-95 transition-all duration-300 hover:scale-105 ring-1 ring-indigo-200/50"
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
      .bg-grid-white {
        background-image: linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
        background-size: 40px 40px;
      }
      input[type="range"]::-webkit-slider-thumb { 
        appearance: none; 
        width: 24px; height: 24px; 
        background: linear-gradient(135deg, rgb(99 102 241), rgb(168 85 247)); 
        border-radius: 50%; 
        cursor: pointer; 
        box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4); 
      }
      input[type="range"]::-moz-range-thumb { 
        width: 24px; height: 24px; 
        background: linear-gradient(135deg, rgb(99 102 241), rgb(168 85 247)); 
        border-radius: 50%; 
        cursor: pointer; 
        box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4); 
        border: none; 
      }
    `}</style>
    </div>
  );
}

export default App;