import React, { useState } from 'react';
import { loginUser } from '../services/apiService';

interface Props {
  onLogin: (email: string, token: string, userId: number, userName: string) => void;
  onShowRegister: () => void;
  onBackToLanding?: () => void;
}

export default function Login({ onLogin, onShowRegister, onBackToLanding }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      const response = await loginUser(email, password);
      onLogin(email, response.token, response.user.id, response.user.full_name || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-lg border border-gray-100">
        {onBackToLanding && (
          <button
            onClick={onBackToLanding}
            className="mb-4 text-gray-600 hover:text-indigo-600 font-medium flex items-center text-sm"
          >
            ← Back to Home
          </button>
        )}

        <h2 className="text-2xl font-bold mb-2">Welcome back</h2>
        <p className="text-sm text-gray-500 mb-6">Log in to continue to Calmi</p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-100"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-100"
              placeholder="••••••••"
            />
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 rounded-2xl font-semibold hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <button onClick={onShowRegister} className="text-indigo-600 font-semibold underline" disabled={isLoading}>
            Register
          </button>
        </div>
      </div>
    </div>
  );
}