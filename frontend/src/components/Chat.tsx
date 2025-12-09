import type React from 'react';
import { Send, Bot, User } from 'lucide-react';
import type { Message } from '../types';
import ReactMarkdown from 'react-markdown'; 
import { useState, useEffect, useRef } from 'react';

interface ChatProps {
  messages: Message[];
  isLoading: boolean;
  inputMessage: string;
  setInputMessage: (s: string) => void;
  sendMessage: () => void;
  handleKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export default function Chat({ 
  messages, 
  isLoading, 
  inputMessage, 
  setInputMessage, 
  sendMessage, 
  handleKeyPress, 
  messagesEndRef 
}: ChatProps) {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [keyboardVisible, setKeyboardVisible] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Detect if device is mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    // Detect virtual keyboard visibility on mobile
    const handleFocus = () => {
      if (isMobile) {
        setKeyboardVisible(true);
        // Scroll to input on focus
        setTimeout(() => {
          inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    };
    
    const handleBlur = () => {
      if (isMobile) {
        setKeyboardVisible(false);
        // Scroll back to messages when keyboard hides
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    };
    
    const inputElement = inputRef.current;
    if (inputElement) {
      inputElement.addEventListener('focus', handleFocus);
      inputElement.addEventListener('blur', handleBlur);
    }
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
      if (inputElement) {
        inputElement.removeEventListener('focus', handleFocus);
        inputElement.removeEventListener('blur', handleBlur);
      }
    };
  }, [isMobile, messagesEndRef]);

  // Adjust scroll when new messages come in while keyboard is open
  useEffect(() => {
    if (keyboardVisible && isMobile) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages, keyboardVisible, isMobile, messagesEndRef]);

  return (
    <div className={`flex flex-col h-full ${isMobile && keyboardVisible ? 'pb-20' : ''}`}>
      <div className={`flex-1 p-4 sm:p-6 overflow-y-auto ${isMobile && keyboardVisible ? 'mb-4' : ''}`}>
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center px-4">
            <div className="max-w-md">
              <div className="bg-gradient-to-br from-indigo-100 to-purple-100 p-6 rounded-3xl inline-block mb-6 shadow-lg">
                <Bot className="w-16 h-16 text-indigo-600" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold mb-3 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Welcome to Calmi! 👋
              </h3>
              <p className="text-gray-600 text-base sm:text-lg leading-relaxed">
                I'm here to support your mental wellness journey. Feel free to share what's on your mind.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-3xl p-4 sm:p-5 shadow-md ${
                    message.sender === 'user'
                      ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-br-md'
                      : 'bg-white text-gray-800 rounded-bl-md border border-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    {message.sender === 'bot' ? (
                      <Bot className="w-4 h-4 text-indigo-500" />
                    ) : (
                      <User className="w-4 h-4 text-white/90" />
                    )}
                    <span className={`text-xs font-medium ${message.sender === 'user' ? 'text-white/90' : 'text-gray-600'}`}>
                      {message.sender === 'bot' ? 'Calmi' : 'You'}
                    </span>
                    <span className={`text-xs ${message.sender === 'user' ? 'text-white/70' : 'text-gray-400'}`}>
                      {message.timestamp}
                    </span>
                  </div>
                  
                  <div 
                    className={`text-sm leading-relaxed ${
                      message.sender === 'bot' ? 'prose prose-sm max-w-none text-gray-800' : ''
                    }`}
                    style={message.sender === 'user' ? { whiteSpace: 'pre-wrap' } : {}}
                  >
                    {message.sender === 'bot' ? (
                      <ReactMarkdown>
                        {message.text}
                      </ReactMarkdown>
                    ) : (
                      message.text
                    )}
                  </div>
                  
                  {message.sentiment && (
                    <div className="mt-3">
                      <span className={`text-xs px-3 py-1 rounded-full border`}>{message.sentiment}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-white text-gray-800 rounded-3xl rounded-bl-md p-5 shadow-md border border-gray-100">
                  <div className="flex items-center space-x-2 mb-2">
                    <Bot className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-medium text-gray-600">Calmi</span>
                  </div>
                  <div className="flex space-x-2">
                    <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce"></div>
                    <div className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                    <div className="w-2.5 h-2.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className={`
        p-4 sm:p-6 border-t border-gray-200/50 bg-white/70 backdrop-blur-sm 
        ${isMobile && keyboardVisible ? 'sticky bottom-0 z-10 shadow-lg' : ''}
        transition-all duration-300
      `}>
        <div className="flex space-x-3">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Share what's on your mind..."
            className="flex-1 border-2 border-gray-200 rounded-full px-4 sm:px-6 py-3 sm:py-4 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white shadow-sm transition-all duration-300 text-base"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !inputMessage.trim()}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-3 sm:p-4 rounded-full hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-110 flex-shrink-0"
          >
            <Send className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}