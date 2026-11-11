'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { createSession } from '@/lib/coach/session-actions';
import { Loader2, AlertCircle } from 'lucide-react';

interface SessionFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function SessionForm({ onSuccess, onCancel }: SessionFormProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    session_date: '',
    start_time: '',
    end_time: '',
    location: '',
  });

  // Client-side validation with field-specific errors
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Check required fields
    if (!formData.title.trim()) {
      errors.title = 'Please enter a session name';
    }

    if (!formData.session_date) {
      errors.session_date = 'Please select a date';
    }

    if (!formData.start_time) {
      errors.start_time = 'Please select start time';
    }

    if (!formData.end_time) {
      errors.end_time = 'Please select end time';
    }

    if (!formData.location.trim()) {
      errors.location = 'Please enter a location';
    }

    // Validate date is not in the past
    if (formData.session_date) {
      const sessionDate = new Date(formData.session_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (sessionDate < today) {
        errors.session_date = 'Cannot create sessions in the past';
      }
    }

    // Validate start_time < end_time
    if (formData.start_time && formData.end_time && formData.start_time >= formData.end_time) {
      errors.end_time = 'End time must be after start time';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFieldErrors({});

    // Client-side validation
    if (!validateForm()) {
      setLoading(false);
      addToast({
        title: 'Invalid data',
        description: 'Please check your entries and try again',
        variant: 'error',
      });
      return;
    }

    // Call server action
    const result = await createSession({
      title: formData.title,
      description: formData.description || undefined,
      session_date: formData.session_date,
      start_time: formData.start_time,
      end_time: formData.end_time,
      location: formData.location,
    });

    if (result.success) {
      addToast({
        title: 'Success!',
        description: 'Training session scheduled successfully',
        variant: 'success',
      });
      
      setFormData({
        title: '',
        description: '',
        session_date: '',
        start_time: '',
        end_time: '',
        location: '',
      });
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      } else {
        // Refresh the page to show new session
        router.refresh();
      }
    } else {
      addToast({
        title: 'An error occurred',
        description: result.error || 'Could not schedule the training session',
        variant: 'error',
      });
    }

    setLoading(false);
  };

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">
          Session name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => {
            setFormData({ ...formData, title: e.target.value });
            clearFieldError('title');
          }}
          placeholder="e.g. daily practice, special training"
          required
          disabled={loading}
          className={fieldErrors.title ? 'border-red-300 focus:border-red-500' : ''}
        />
        {fieldErrors.title && (
          <div className="flex items-center gap-1 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>{fieldErrors.title}</span>
          </div>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Details (optional)</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Additional details about the training"
          disabled={loading}
          rows={3}
        />
      </div>

      {/* Session Date */}
      <div className="space-y-2">
        <Label htmlFor="session_date">
          Date <span className="text-red-500">*</span>
        </Label>
        <Input
          id="session_date"
          type="date"
          value={formData.session_date}
          onChange={(e) => {
            setFormData({ ...formData, session_date: e.target.value });
            clearFieldError('session_date');
          }}
          required
          disabled={loading}
          min={new Date().toISOString().split('T')[0]}
          className={fieldErrors.session_date ? 'border-red-300 focus:border-red-500' : ''}
        />
        {fieldErrors.session_date && (
          <div className="flex items-center gap-1 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>{fieldErrors.session_date}</span>
          </div>
        )}
      </div>

      {/* Time Range */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_time">
            Start time <span className="text-red-500">*</span>
          </Label>
          <Input
            id="start_time"
            type="time"
            value={formData.start_time}
            onChange={(e) => {
              setFormData({ ...formData, start_time: e.target.value });
              clearFieldError('start_time');
            }}
            required
            disabled={loading}
            className={fieldErrors.start_time ? 'border-red-300 focus:border-red-500' : ''}
          />
          {fieldErrors.start_time && (
            <div className="flex items-center gap-1 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>{fieldErrors.start_time}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="end_time">
            End time <span className="text-red-500">*</span>
          </Label>
          <Input
            id="end_time"
            type="time"
            value={formData.end_time}
            onChange={(e) => {
              setFormData({ ...formData, end_time: e.target.value });
              clearFieldError('end_time');
            }}
            required
            disabled={loading}
            className={fieldErrors.end_time ? 'border-red-300 focus:border-red-500' : ''}
          />
          {fieldErrors.end_time && (
            <div className="flex items-center gap-1 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>{fieldErrors.end_time}</span>
            </div>
          )}
        </div>
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label htmlFor="location">
          Location <span className="text-red-500">*</span>
        </Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => {
            setFormData({ ...formData, location: e.target.value });
            clearFieldError('location');
          }}
          placeholder="e.g. Field A, gym room"
          required
          disabled={loading}
          className={fieldErrors.location ? 'border-red-300 focus:border-red-500' : ''}
        />
        {fieldErrors.location && (
          <div className="flex items-center gap-1 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>{fieldErrors.location}</span>
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            'Schedule training session'
          )}
        </Button>
      </div>
    </form>
  );
}
