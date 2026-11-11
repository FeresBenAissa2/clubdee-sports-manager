'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createPerformanceRecord } from '@/lib/coach/performance-actions';
import { Loader2 } from 'lucide-react';

interface Athlete {
  id: string;
  first_name: string;
  last_name: string;
  nickname: string | null;
}

interface PerformanceRecordFormProps {
  athletes: Athlete[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Common test types for sports
const TEST_TYPES = [
  'Speed',
  'Strength',
  'Endurance',
  'Flexibility',
  'Agility',
  'Skill',
  'Other',
];

// Common units
const UNITS = [
  'Seconds',
  'Minutes',
  'Meters',
  'Kilograms (kg)',
  'Reps',
  'Points',
  'Centimeters (cm)',
  'Other',
];

export function PerformanceRecordForm({
  athletes,
  onSuccess,
  onCancel,
}: PerformanceRecordFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    athleteId: '',
    testType: '',
    testName: '',
    score: '',
    unit: '',
    testDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.athleteId) {
      setError('Please select an athlete');
      return;
    }
    if (!formData.testType) {
      setError('Please select test type');
      return;
    }
    if (!formData.testName.trim()) {
      setError('Please enter test name');
      return;
    }
    if (!formData.score || isNaN(parseFloat(formData.score))) {
      setError('Please enter a valid score');
      return;
    }
    if (!formData.unit) {
      setError('Please select a unit');
      return;
    }
    if (!formData.testDate) {
      setError('Please select test date');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createPerformanceRecord({
        athleteId: formData.athleteId,
        testType: formData.testType,
        testName: formData.testName.trim(),
        score: parseFloat(formData.score),
        unit: formData.unit,
        testDate: formData.testDate,
        notes: formData.notes.trim() || undefined,
      });

      if (result.success) {
        // Reset form
        setFormData({
          athleteId: '',
          testType: '',
          testName: '',
          score: '',
          unit: '',
          testDate: new Date().toISOString().split('T')[0],
          notes: '',
        });
        onSuccess?.();
      } else {
        setError(result.error || 'Error saving data');
      }
    } catch (err) {
      console.error('Error submitting performance record:', err);
      setError('Error saving data');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Athlete Selection */}
      <div className="space-y-2">
        <Label htmlFor="athlete">Athletes *</Label>
        <Select
          value={formData.athleteId}
          onValueChange={(value) =>
            setFormData({ ...formData, athleteId: value })
          }
        >
          <SelectTrigger id="athlete">
            <SelectValue placeholder="Select athlete" />
          </SelectTrigger>
          <SelectContent>
            {athletes.map((athlete) => (
              <SelectItem key={athlete.id} value={athlete.id}>
                {athlete.first_name} {athlete.last_name}
                {athlete.nickname && ` (${athlete.nickname})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Test Type */}
      <div className="space-y-2">
        <Label htmlFor="testType">Test type *</Label>
        <Select
          value={formData.testType}
          onValueChange={(value) =>
            setFormData({ ...formData, testType: value })
          }
        >
          <SelectTrigger id="testType">
            <SelectValue placeholder="Select test type" />
          </SelectTrigger>
          <SelectContent>
            {TEST_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Test Name */}
      <div className="space-y-2">
        <Label htmlFor="testName">Test name *</Label>
        <Input
          id="testName"
          type="text"
          placeholder="e.g. 100m run, push-ups, etc."
          value={formData.testName}
          onChange={(e) =>
            setFormData({ ...formData, testName: e.target.value })
          }
          required
        />
      </div>

      {/* Score and Unit */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="score">Score *</Label>
          <Input
            id="score"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={formData.score}
            onChange={(e) =>
              setFormData({ ...formData, score: e.target.value })
            }
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="unit">Unit *</Label>
          <Select
            value={formData.unit}
            onValueChange={(value) =>
              setFormData({ ...formData, unit: value })
            }
          >
            <SelectTrigger id="unit">
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              {UNITS.map((unit) => (
                <SelectItem key={unit} value={unit}>
                  {unit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Test Date */}
      <div className="space-y-2">
        <Label htmlFor="testDate">Test date *</Label>
        <Input
          id="testDate"
          type="date"
          value={formData.testDate}
          onChange={(e) =>
            setFormData({ ...formData, testDate: e.target.value })
          }
          max={new Date().toISOString().split('T')[0]}
          required
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Additional notes (optional)"
          value={formData.notes}
          onChange={(e) =>
            setFormData({ ...formData, notes: e.target.value })
          }
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save test results'
          )}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
