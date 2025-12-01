import React, { useState } from 'react';

interface Props {
  onLogin: (email: string) => void;
  onShowRegister: () => void;
  onBackToLanding?: () => void; // ✅ optional prop
}

export default function Login({ onLogin, onShowRegister, onBackToLanding }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    onLogin(email);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-lg border border-gray-100">
        {/* ✅ Back button added here */}
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
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="••••••••"
            />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 rounded-2xl font-semibold hover:shadow-md transition-all"
          >
            Log in
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <button onClick={onShowRegister} className="text-indigo-600 font-semibold underline">
            Register
          </button>
        </div>
      </div>
    </div>
  );
}