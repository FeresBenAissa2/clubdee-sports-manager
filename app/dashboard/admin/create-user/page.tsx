'use client';

/**
 * Admin Create User Page
 * 
 * Features:
 * - Create new user accounts (bypasses rate limiting)
 * - Select user role (admin, coach, athlete)
 * - Assign to club (for coach/athlete)
 * - Auto-generate secure password or custom password
 * - Create profile and related records automatically
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, UserPlus, CheckCircle2, AlertCircle, Copy, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface FormData {
  email: string;
  password: string;
  full_name: string;
  role: 'admin' | 'coach' | 'athlete';
  club_id?: string;
}

export default function CreateUserPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: generatePassword(),
    full_name: '',
    role: 'athlete',
  });
  const [createdUser, setCreatedUser] = useState<{
    email: string;
    password: string;
    role: string;
  } | null>(null);

  function generatePassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  function handleGeneratePassword() {
    setFormData({ ...formData, password: generatePassword() });
    toast({
      title: 'Generate new password',
      description: 'A password was generated',
    });
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: `${label} copied to clipboard`,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.email || !formData.password || !formData.full_name) {
      toast({
        title: 'Please complete all required fields',
        description: 'Email, password, and full name are required',
        variant: 'error',
      });
      return;
    }

    setLoading(true);
    setCreatedUser(null);

    try {
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          role: formData.role,
          club_id: formData.club_id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Could not create user');
      }

      toast({
        title: 'User created successfully! 🎉',
        description: `Account ${formData.email} was created successfully`,
      });

      // Save created user info for display
      setCreatedUser({
        email: formData.email,
        password: formData.password,
        role: formData.role,
      });

      // Reset form
      setFormData({
        email: '',
        password: generatePassword(),
        full_name: '',
        role: 'athlete',
      });
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: 'An error occurred',
        description: error.message || 'Could not create user',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Create user account</h1>
        <p className="text-gray-600 mt-1">
          Create a new account for an admin, coach, or athlete
        </p>
      </div>

      {/* Success Message */}
      {createdUser && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription>
            <div className="space-y-3">
              <p className="font-medium text-green-800">
                Account created successfully!
              </p>
              <div className="bg-white rounded-lg p-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Email:</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-medium">{createdUser.email}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(createdUser.email, 'Email')}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Password:</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-medium">{createdUser.password}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(createdUser.password, 'Password')}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Role:</span>
                  <span className="font-medium capitalize">{createdUser.role}</span>
                </div>
              </div>
              <p className="text-xs text-green-700">
                Send login details to the user and recommend changing the password after first login
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Create User Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserPlus className="w-5 h-5 mr-2" />
            User information
          </CardTitle>
          <CardDescription>
            Fill in details to create a new user (not rate limited)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="full_name">
                Full name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="full_name"
                type="text"
                placeholder="First last name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label htmlFor="role">
                Role <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.role}
                onValueChange={(value: 'admin' | 'coach' | 'athlete') =>
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="athlete">Athlete (Athletes)</SelectItem>
                  <SelectItem value="coach">Coach (Coach)</SelectItem>
                  <SelectItem value="admin">Admin (administrator)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {formData.role === 'athlete' && '• Athletes: can view the training schedule, check in, and view training results'}
                {formData.role === 'coach' && '• Coaches: can manage training schedules, record results, and approve applications'}
                {formData.role === 'admin' && '• Admins: have full access to manage the entire system'}
              </p>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">
                Password <span className="text-red-500">*</span>
              </Label>
              <div className="flex space-x-2">
                <Input
                  id="password"
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGeneratePassword}
                  title="Generate new password"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Click Refresh to generate a secure random password
              </p>
            </div>

            {/* Info Alert */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <p className="font-medium mb-2">Note:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>The account is created immediately and is not rate limited</li>
                  <li>Related profile and records are created automatically</li>
                  <li>The user can log in and change their password immediately</li>
                  <li>Coaches/athletes are assigned to the first club in the system</li>
                </ul>
              </AlertDescription>
            </Alert>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading || !formData.email || !formData.full_name || !formData.password}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create user account
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-lg">Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-medium mb-1">Security</p>
            <p className="text-gray-600">
              Use a strong password (at least 8 characters) and share login details securely
            </p>
          </div>
          <div>
            <p className="font-medium mb-1">User roles</p>
            <p className="text-gray-600">
              Choose the appropriate role so the user has the correct access
            </p>
          </div>
          <div>
            <p className="font-medium mb-1">After creating the account</p>
            <p className="text-gray-600">
              Send login details (email + password) and recommend changing the password after the first login
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
