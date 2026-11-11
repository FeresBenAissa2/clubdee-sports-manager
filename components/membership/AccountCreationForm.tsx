'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';

interface AccountCreationFormProps {
  value: {
    email: string;
    password: string;
    confirmPassword: string;
  };
  onChange: (value: {
    email: string;
    password: string;
    confirmPassword: string;
  }) => void;
  errors: Record<string, string>;
}

export default function AccountCreationForm({
  value,
  onChange,
  errors,
}: AccountCreationFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (field: string, fieldValue: string) => {
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">
          Welcome to ClubDee
        </h3>
        <p className="text-sm text-blue-800">
          Create an account to start your membership application.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">
          Email <span className="text-red-500">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          name="email"
          autoComplete="email"
          value={value.email}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="your.email@example.com"
          className={errors.email ? 'border-red-500' : ''}
        />
        {errors.email ? <p className="text-sm text-red-600">{errors.email}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">
          Password <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={value.password}
            onChange={(e) => handleChange('password', e.target.value)}
            placeholder="••••••••"
            className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.password ? <p className="text-sm text-red-600">{errors.password}</p> : null}
        <p className="text-xs text-gray-500">At least 8 characters</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">
          Confirm password <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={value.confirmPassword}
            onChange={(e) => handleChange('confirmPassword', e.target.value)}
            placeholder="••••••••"
            className={errors.confirmPassword ? 'border-red-500 pr-10' : 'pr-10'}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.confirmPassword ? (
          <p className="text-sm text-red-600">{errors.confirmPassword}</p>
        ) : null}
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Next steps</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Enter your personal information</li>
          <li>• Choose your sport</li>
          <li>• Wait for coach approval</li>
        </ul>
      </div>
    </div>
  );
}
