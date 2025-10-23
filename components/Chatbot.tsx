import React, { useState, useRef, useEffect } from 'react';
import type { HistoryEntry } from '../types';
import { getChatbotResponse, processAnalyticalQuery, isChatbotAvailable } from '../services/geminiService';
import { ApiKeySetup } from './ApiKeySetup';
import { SendIcon, CloseIcon } from './icons';

interface ChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryEntry[];
}

interface Message {
  text: string;
  sender: 'user' | 'bot';
}

const TypingIndicator: React.FC = () => (
  <div className="flex items-center space-x-1 p-2">
    <span className="text-gray-400">El asistente está escribiendo</span>
    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce-1"></div>
    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce-2"></div>
    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce-3"></div>
  </div>
);

export const Chatbot: React.FC<ChatbotProps> = ({ isOpen, onClose, history }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'bot',
      text: isChatbotAvailable()
        ? '¡Hola! Soy tu asistente de viajes. Pregúntame sobre tu historial de ubicaciones.'
        : '🤖 Chatbot no disponible. Configura tu API key de Gemini para habilitar respuestas inteligentes.'
    },
  ]);

  // Estado para controlar si hemos saludado inicialmente
  const [hasInitialGreeting, setHasInitialGreeting] = useState(false);

  // Mostrar saludo inicial cuando el chatbot se vuelve disponible
  useEffect(() => {
    if (isChatbotAvailable() && !hasInitialGreeting && messages.length === 1) {
      const botMessage: Message = {
        sender: 'bot',
        text: '¡Hola! Soy tu asistente de viajes. Pregúntame sobre tu historial de ubicaciones.'
      };
      setMessages([botMessage]);
      setHasInitialGreeting(true);
    }
  }, [isChatbotAvailable(), hasInitialGreeting, messages.length]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKeySetup, setShowApiKeySetup] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = inputValue.trim();
    if (!trimmedInput || isLoading) return;

    // Verificar si el chatbot está disponible
    if (!isChatbotAvailable()) {
      const userMessage: Message = { sender: 'user', text: trimmedInput };
      setMessages(prev => [...prev, userMessage]);

      const botMessage: Message = {
        sender: 'bot',
        text: '🤖 El chatbot no está disponible porque falta configurar la API key de Gemini. Haz clic en "Configurar API Key" para habilitar respuestas inteligentes.'
      };

      setMessages(prev => [...prev, botMessage]);
      setInputValue('');
      return;
    }

    const userMessage: Message = { sender: 'user', text: trimmedInput };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const botResponse = await processAnalyticalQuery(trimmedInput, history);
      const botMessage: Message = { sender: 'bot', text: botResponse };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: Message = {
        sender: 'bot',
        text: 'Lo siento, ocurrió un error al procesar tu solicitud. Por favor, intenta de nuevo.',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/60 z-40 animate-fade-in-fast"
        onClick={onClose}
        aria-hidden="true"
      ></div>
      <div className="fixed bottom-0 right-0 sm:bottom-4 sm:right-4 w-full h-full sm:h-[70vh] sm:max-h-[600px] max-w-lg bg-gray-800 rounded-t-lg sm:rounded-lg shadow-2xl z-50 flex flex-col border border-gray-700 animate-slide-in-up">
        <header className="flex items-center justify-between p-4 bg-gray-900/70 border-b border-gray-700 rounded-t-lg sm:rounded-t-lg flex-shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">Asistente de Viajes</h2>
            {!isChatbotAvailable() && (
              <span className="text-xs bg-yellow-600 text-yellow-100 px-2 py-1 rounded-full">
                ⚠️ Sin IA
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isChatbotAvailable() && (
              <button
                onClick={() => setShowApiKeySetup(true)}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                title="Configurar API key de Gemini"
              >
                🔑 Configurar IA
              </button>
            )}
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-white transition-colors" aria-label="Close chat">
              <CloseIcon />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-xl px-4 py-2 text-white shadow-md ${
                  msg.sender === 'user' ? 'bg-blue-600 rounded-br-none' : 'bg-gray-700 rounded-bl-none'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
               <div className="max-w-[80%] rounded-xl px-4 py-2 text-white bg-gray-700 rounded-bl-none">
                 <TypingIndicator />
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </main>

        <footer className="p-4 border-t border-gray-700 bg-gray-800 rounded-b-lg flex-shrink-0">
          <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Escribe tu pregunta..."
              disabled={isLoading}
              className="w-full bg-gray-900/50 border border-gray-600 rounded-full py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all"
              aria-label="Send message"
            >
              <SendIcon />
            </button>
          </form>
        </footer>
      </div>
       <style>{`
        @keyframes fade-in-fast {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in-fast {
          animation: fade-in-fast 0.2s ease-out forwards;
        }

        @keyframes slide-in-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @media (min-width: 640px) {
           @keyframes slide-in-up {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        }
        .animate-slide-in-up {
          animation: slide-in-up 0.3s ease-out forwards;
        }

        @keyframes bounce-1 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-bounce-1 { animation: bounce-1 1.2s infinite; }
        .animate-bounce-2 { animation: bounce-1 1.2s infinite 0.2s; }
        .animate-bounce-3 { animation: bounce-1 1.2s infinite 0.4s; }
      `}</style>

      {/* API Key Setup Modal */}
      <ApiKeySetup
        isOpen={showApiKeySetup}
        onClose={() => setShowApiKeySetup(false)}
        onApiKeySet={() => {
          // Actualizar el mensaje inicial cuando se configure la API key
          setMessages([
            { sender: 'bot', text: '¡Hola! Soy tu asistente de viajes. Pregúntame sobre tu historial de ubicaciones.' },
          ]);
        }}
      />
    </>
  );
};
