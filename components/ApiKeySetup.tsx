import React, { useState } from 'react';
import { setApiKey, isChatbotAvailable } from '../services/geminiService';

interface ApiKeySetupProps {
  onApiKeySet?: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const ApiKeySetup: React.FC<ApiKeySetupProps> = ({
  onApiKeySet,
  isOpen,
  onClose
}) => {
  const [apiKey, setApiKeyInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!apiKey.trim()) {
      setError('Por favor ingresa una API key válida');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess(false);

    try {
      const success = setApiKey(apiKey.trim());

      if (success) {
        setSuccess(true);
        setError('');

        // Notificar al componente padre
        if (onApiKeySet) {
          onApiKeySet();
        }

        // Cerrar modal después de 2 segundos
        setTimeout(() => {
          onClose();
          setApiKeyInput('');
          setSuccess(false);
        }, 2000);
      } else {
        setError('API key inválida. Verifica que sea correcta.');
      }
    } catch (err) {
      setError('Error al configurar la API key. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetApiKey = () => {
    window.open('https://ai.google.dev/', '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full">
        <div className="p-6 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">🤖 Configurar Chatbot IA</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
              disabled={isLoading}
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
          {!isChatbotAvailable() && (
            <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-500 text-yellow-300 rounded">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">⚠️</span>
                <span className="font-semibold">Chatbot No Disponible</span>
              </div>
              <p className="text-sm">
                El chatbot inteligente requiere una API key de Gemini para funcionar.
                El resto de la aplicación funciona normalmente.
              </p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-900/20 border border-green-500 text-green-300 rounded">
              <div className="flex items-center gap-2">
                <span className="text-lg">✅</span>
                <span className="font-semibold">API Key Configurada Exitosamente</span>
              </div>
              <p className="text-sm mt-1">El chatbot ahora está disponible.</p>
            </div>
          )}

          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white mb-2">¿Cómo obtener tu API Key?</h3>
            <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
              <li>Ve a <span className="text-blue-400 underline cursor-pointer" onClick={handleGetApiKey}>ai.google.dev</span></li>
              <li>Crea una cuenta o inicia sesión</li>
              <li>Ve a "Get API key" en la consola</li>
              <li>Crea una nueva API key</li>
              <li>Copia y pega la API key aquí</li>
            </ol>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-300 mb-2">
                API Key de Gemini
              </label>
              <input
                type="password"
                id="apiKey"
                value={apiKey}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Ingresa tu API key..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Tu API key se guarda localmente y nunca se envía a nuestros servidores.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-500 text-red-300 rounded text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isLoading || !apiKey.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors disabled:cursor-not-allowed"
              >
                {isLoading ? 'Configurando...' : 'Configurar API Key'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                disabled={isLoading}
              >
                Más Tarde
              </button>
            </div>
          </form>

          <div className="mt-4 text-xs text-gray-500 text-center">
            <p>💡 <strong>¿Por qué necesito esto?</strong></p>
            <p>El chatbot usa IA para responder preguntas inteligentes sobre tus datos GPS.</p>
            <p>Es gratuito para uso básico y se procesa localmente en tu navegador.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
