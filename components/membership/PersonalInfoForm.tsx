'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  personalInfoSchema,
  formatPhoneNumber,
  type PersonalInfoInput,
} from '@/lib/membership/validation';
import { z } from 'zod';

interface PersonalInfoFormProps {
  value: PersonalInfoInput;
  onChange: (value: PersonalInfoInput) => void;
  errors?: Record<string, string>;
}

export default function PersonalInfoForm({
  value,
  onChange,
  errors = {},
}: PersonalInfoFormProps) {
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const displayErrors = { ...localErrors, ...errors };

  const validateField = (fieldName: keyof PersonalInfoInput, fieldValue: string) => {
    try {
      personalInfoSchema.shape[fieldName].parse(fieldValue);
      setLocalErrors((prev) => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        setLocalErrors((prev) => ({
          ...prev,
          [fieldName]: error.issues[0]?.message || 'Invalid value',
        }));
      }
    }
  };

  const handleChange = (field: keyof PersonalInfoInput, inputValue: string) => {
    let processedValue = inputValue;
    if (field === 'phone_number' || field === 'emergency_contact') {
      processedValue = formatPhoneNumber(inputValue);
    }
    onChange({ ...value, [field]: processedValue });
    if (touched[field]) validateField(field, processedValue);
  };

  const handleBlur = (field: keyof PersonalInfoInput) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, value[field] || '');
  };

  return (
    <div className="space-y-6" translate="no">
      <div className="space-y-2">
        <Label htmlFor="full_name">
          Full name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="full_name"
          name="full_name"
          type="text"
          value={value.full_name || ''}
          onChange={(e) => handleChange('full_name', e.target.value)}
          onBlur={() => handleBlur('full_name')}
          placeholder="e.g. Mohamed Dridi"
          className={displayErrors.full_name ? 'border-red-500' : ''}
        />
        {displayErrors.full_name ? (
          <p className="text-sm text-red-600">{displayErrors.full_name}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="nickname">Nickname</Label>
        <Input
          id="nickname"
          name="nickname"
          type="text"
          value={value.nickname || ''}
          onChange={(e) => handleChange('nickname', e.target.value)}
          placeholder="Optional"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="gender">
          Gender <span className="text-red-500">*</span>
        </Label>
        <select
          id="gender"
          name="gender"
          value={value.gender || ''}
          onChange={(e) => handleChange('gender', e.target.value)}
          onBlur={() => handleBlur('gender')}
          className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
            displayErrors.gender ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="">Select gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
        {displayErrors.gender ? (
          <p className="text-sm text-red-600">{displayErrors.gender}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="date_of_birth">
          Date of birth <span className="text-red-500">*</span>
        </Label>
        <Input
          id="date_of_birth"
          name="date_of_birth"
          type="date"
          value={value.date_of_birth || ''}
          onChange={(e) => handleChange('date_of_birth', e.target.value)}
          onBlur={() => handleBlur('date_of_birth')}
          className={displayErrors.date_of_birth ? 'border-red-500' : ''}
        />
        {displayErrors.date_of_birth ? (
          <p className="text-sm text-red-600">{displayErrors.date_of_birth}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone_number">
          Phone number <span className="text-red-500">*</span>
        </Label>
        <Input
          id="phone_number"
          name="phone_number"
          type="tel"
          value={value.phone_number || ''}
          onChange={(e) => handleChange('phone_number', e.target.value)}
          onBlur={() => handleBlur('phone_number')}
          placeholder="+216 12 345 678"
          className={displayErrors.phone_number ? 'border-red-500' : ''}
        />
        {displayErrors.phone_number ? (
          <p className="text-sm text-red-600">{displayErrors.phone_number}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">
          Address <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="address"
          name="address"
          value={value.address || ''}
          onChange={(e) => handleChange('address', e.target.value)}
          onBlur={() => handleBlur('address')}
          placeholder="Street, city, country"
          rows={4}
          className={displayErrors.address ? 'border-red-500' : ''}
        />
        {displayErrors.address ? (
          <p className="text-sm text-red-600">{displayErrors.address}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="emergency_contact">
          Emergency contact phone <span className="text-red-500">*</span>
        </Label>
        <Input
          id="emergency_contact"
          name="emergency_contact"
          type="tel"
          value={value.emergency_contact || ''}
          onChange={(e) => handleChange('emergency_contact', e.target.value)}
          onBlur={() => handleBlur('emergency_contact')}
          placeholder="+216 98 765 432"
          className={displayErrors.emergency_contact ? 'border-red-500' : ''}
        />
        {displayErrors.emergency_contact ? (
          <p className="text-sm text-red-600">{displayErrors.emergency_contact}</p>
        ) : null}
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="mb-4 text-sm font-medium text-gray-700">Optional health info</p>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="blood_type">Blood type</Label>
            <Input
              id="blood_type"
              name="blood_type"
              type="text"
              value={value.blood_type || ''}
              onChange={(e) => handleChange('blood_type', e.target.value)}
              placeholder="A, B, AB, O"
              maxLength={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="medical_conditions">Medical conditions / notes</Label>
            <Textarea
              id="medical_conditions"
              name="medical_conditions"
              value={value.medical_conditions || ''}
              onChange={(e) => handleChange('medical_conditions', e.target.value)}
              placeholder="Allergies, conditions, or notes for coaches"
              rows={3}
            />
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500">
        <span className="text-red-500">*</span> Required fields
      </p>
    </div>
  );
}
