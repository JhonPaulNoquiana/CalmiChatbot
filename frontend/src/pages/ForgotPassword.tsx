import React, { useState } from 'react';
import { ArrowLeft, Mail, Key, CheckCircle } from 'lucide-react';

interface Props {
  onBackToLogin: () => void;
  onSuccess?: () => void;
}

export default function ForgotPassword({ onBackToLogin, onSuccess }: Props) {
  const [step, setStep] = useState<'email' | 'code' | 'newPassword'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!email) {
        setError('Please enter your email address');
        return;
    }

    setIsLoading(true);
    try {
        const response = await fetch('http://localhost:5000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        });

        const data = await response.json();

        if (!response.ok) {
        // ✅ NEW: Handle "no account" error specifically
        if (response.status === 404 && data.error && data.error.includes('No account found')) {
            throw new Error(`No account found with email: ${email}\n\nPlease check your email or register first.`);
        }
        throw new Error(data.error || 'Failed to send reset code');
        }

        // Check if dev code is returned (email not configured)
        if (data.dev_code) {
        setSuccess(`Reset code generated: ${data.dev_code}\n\n(Check console - email not configured)`);
        console.log(`📧 Reset code for ${email}: ${data.dev_code}`);
        } else {
        setSuccess('Reset code sent to your email! Check your inbox.');
        }
        
        setStep('code');
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send reset code');
    } finally {
        setIsLoading(false);
    }
    };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!code) {
      setError('Please enter the verification code');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid verification code');
      }

      setStep('newPassword');
      setSuccess('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!newPassword || !confirmPassword) {
      setError('Please enter and confirm your new password');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setSuccess('Password reset successfully! You can now login with your new password.');
      
      // Auto redirect after 3 seconds
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onBackToLogin();
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-lg border border-gray-100">
        <button
          onClick={onBackToLogin}
          className="mb-4 text-gray-600 hover:text-indigo-600 font-medium flex items-center text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Login
        </button>

        <h2 className="text-2xl font-bold mb-2">Reset Your Password</h2>
        <p className="text-sm text-gray-500 mb-6">
          {step === 'email' && 'Enter your email to receive a reset code'}
          {step === 'code' && 'Enter the verification code sent to your email'}
          {step === 'newPassword' && 'Create your new password'}
        </p>

        {step === 'email' && (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="w-full border-2 border-gray-200 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-100"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}
            {success && <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">{success}</div>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 rounded-2xl font-semibold hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Sending...' : 'Send Reset Code'}
            </button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Verification Code</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={isLoading}
                  className="w-full border-2 border-gray-200 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-100"
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Check your email for the 6-digit verification code
              </p>
            </div>

            {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}
            {success && <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">{success}</div>}

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setStep('email')}
                disabled={isLoading}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-2xl font-semibold hover:bg-gray-200 transition-all"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 rounded-2xl font-semibold hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Verifying...' : 'Verify Code'}
              </button>
            </div>
          </form>
        )}

        {step === 'newPassword' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoading}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-100"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-100"
                placeholder="••••••••"
              />
            </div>

            {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}
            {success && (
              <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg flex items-center">
                <CheckCircle className="w-4 h-4 mr-2" />
                {success}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setStep('code')}
                disabled={isLoading}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-2xl font-semibold hover:bg-gray-200 transition-all"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading || !!success}
                className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 rounded-2xl font-semibold hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}