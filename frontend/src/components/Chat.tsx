import type React from 'react';
import { Send, Bot, User } from 'lucide-react';
import type { Message } from '../types';

interface ChatProps {
  messages: Message[];
  isLoading: boolean;
  inputMessage: string;
  setInputMessage: (s: string) => void;
  sendMessage: () => void;
  handleKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export default function Chat({ messages, isLoading, inputMessage, setInputMessage, sendMessage, handleKeyPress, messagesEndRef }: ChatProps) {
  return (
    <>
      <div className="flex-1 p-6 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center">
            <div className="max-w-md">
              <div className="bg-gradient-to-br from-indigo-100 to-purple-100 p-6 rounded-3xl inline-block mb-6 shadow-lg">
                <Bot className="w-16 h-16 text-indigo-600" />
              </div>
              <h3 className="text-3xl font-bold mb-3 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Welcome to Calmi! 👋
              </h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                I'm here to support your mental wellness journey. Feel free to share what's on your mind.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div
                  className={`max-w-[75%] rounded-3xl p-5 shadow-md ${
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
                  <p className="text-sm leading-relaxed">{message.text}</p>
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

      <div className="p-6 border-t border-gray-200/50 bg-white/70 backdrop-blur-sm">
        <div className="flex space-x-3">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Share what's on your mind..."
            className="flex-1 border-2 border-gray-200 rounded-full px-6 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white shadow-sm transition-all duration-300"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !inputMessage.trim()}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-4 rounded-full hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-110"
          >
            <Send className="w-6 h-6" />
          </button>
        </div>
      </div>
    </>
  );
}
