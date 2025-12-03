import React, { useState } from 'react';
import { registerUser } from '../services/apiService';

interface Props {
  onRegister: (email: string, token: string, userId: number, userName: string) => void;
  onShowLogin: () => void;
  onBackToLanding?: () => void;
}

export default function Register({ onRegister, onShowLogin, onBackToLanding }: Props) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }
    
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      const response = await registerUser(email, password, fullName);
      onRegister(email, response.token, response.user.id, response.user.full_name || fullName || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-lg border border-gray-100">
        {/* ← Back to Home Button */}
        {onBackToLanding && (
          <button
            onClick={onBackToLanding}
            className="mb-4 text-gray-600 hover:text-indigo-600 font-medium flex items-center text-sm transition-colors"
          >
            ← Back to Home
          </button>
        )}
        
        <h2 className="text-2xl font-bold mb-2">Create account</h2>
        <p className="text-sm text-gray-500 mb-6">Register to start your wellness journey</p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Full Name (optional)</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isLoading}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-100"
              placeholder="John Doe"
            />
          </div>

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

          <div>
            <label className="block text-sm font-semibold mb-1">Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
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
            {isLoading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <button onClick={onShowLogin} className="text-indigo-600 font-semibold underline" disabled={isLoading}>
            Log in
          </button>
        </div>
      </div>
    </div>
  );
}
