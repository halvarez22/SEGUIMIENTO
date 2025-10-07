import React, { useState } from 'react';
import { Spinner, EyeIcon, EyeOffIcon } from './icons';

interface LoginProps {
  onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setIsLoading(true);

    // Simulate an API call and check for admin credentials.
    setTimeout(() => {
      if (email === 'admin' && password === 'admin') {
        setIsLoading(false);
        onLogin();
      } else {
        setIsLoading(false);
        setError('Invalid email or password.');
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <header className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Image Location Extractor
          </h1>
          <p className="mt-2 text-base sm:text-lg text-gray-400">
            Please sign in to continue
          </p>
        </header>
        <div className="bg-gray-800 shadow-2xl rounded-lg p-6 sm:p-8 border border-gray-700">
          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-300"
                >
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-900/50 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                    placeholder="admin"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-300"
                >
                  Password
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    name="password"
                    type={isPasswordVisible ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-900/50 border border-gray-600 rounded-md py-2 px-3 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                    placeholder="admin"
                    disabled={isLoading}
                  />
                   <button
                    type="button"
                    onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200"
                    aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                    disabled={isLoading}
                  >
                    {isPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>
              
              {error && (
                 <p className="text-sm text-red-400 text-center">{error}</p>
              )}

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? <Spinner /> : 'Sign In'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};