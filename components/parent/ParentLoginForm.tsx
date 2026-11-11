'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { parentLogin } from '@/lib/parent-auth/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Lock, AlertCircle } from 'lucide-react';

export function ParentLoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await parentLogin(formData.email, formData.password);

      if (result.success) {
        router.push('/parent/dashboard');
        router.refresh();
      } else {
        setError(result.error || 'An error occurred while signing in');
      }
    } catch (err) {
      setError('An error occurred while connecting');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email" className="text-gray-700">
          Email
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            id="email"
            type="email"
            placeholder="parent@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="pl-10"
            required
            disabled={loading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-gray-700">
          Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            id="password"
            type="password"
            placeholder="••••••"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="pl-10"
            required
            disabled={loading}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-gray-600">Remember me</span>
        </label>
        <a href="/parent/forgot-password" className="text-blue-600 hover:underline">
          Forgot password?
        </a>
      </div>

      <Button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        disabled={loading}
      >
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Sign in
      </Button>

      {/* Demo Account Button */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center mb-2">
          Try the demo account
        </p>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => {
            setFormData({
              email: 'parent.demo@example.com',
              password: 'demo1234',
            });
          }}
          disabled={loading}
        >
          Enter demo code
        </Button>
      </div>
    </form>
  );
}
