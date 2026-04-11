import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, User, Loader2 } from 'lucide-react';
import { post } from '../services/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
  data?: any;
}

export function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m your AML Guardian AI assistant. I can help you find clients, check compliance status, review risks, and answer AML questions. What would you like to know?',
      suggestions: ['Show high-risk clients', 'Check compliance status', 'Find a client'],
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (text: string = input) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await post('/chat', { message: text }) as any;
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data?.message || 'I apologize, I could not process your request.',
        suggestions: response.data?.suggestions,
        data: response.data?.data,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 flex items-center justify-center transition-transform hover:scale-110 z-50"
        title="Ask AML AI"
      >
        <Bot className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white rounded-t-2xl">
        <div className="flex items-center">
          <Bot className="w-5 h-5 mr-2" />
          <span className="font-semibold">AML AI Assistant</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white/80 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-gray-100 text-gray-800 rounded-bl-none'
              }`}
            >
              <div className="flex items-center mb-1">
                {message.role === 'assistant' ? (
                  <Bot className="w-4 h-4 mr-1 text-blue-600" />
                ) : (
                  <User className="w-4 h-4 mr-1" />
                )}
                <span className="text-xs opacity-75">
                  {message.role === 'assistant' ? 'AI Assistant' : 'You'}
                </span>
              </div>
              <div className="whitespace-pre-line text-sm">{message.content}</div>
              
              {/* Suggestions */}
              {message.suggestions && message.suggestions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="text-xs px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-bl-none px-4 py-3">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="px-4 py-2 border-t border-gray-100 flex flex-wrap gap-2">
        <button
          onClick={() => handleSuggestionClick('Show high-risk clients')}
          className="text-xs px-3 py-1 bg-red-50 text-red-700 rounded-full hover:bg-red-100"
        >
          High-risk clients
        </button>
        <button
          onClick={() => handleSuggestionClick('Check compliance')}
          className="text-xs px-3 py-1 bg-green-50 text-green-700 rounded-full hover:bg-green-100"
        >
          Compliance status
        </button>
        <button
          onClick={() => handleSuggestionClick('Pending documents')}
          className="text-xs px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full hover:bg-yellow-100"
        >
          Pending docs
        </button>
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
        className="p-4 border-t border-gray-200"
      >
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about clients, compliance, risks..."
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
