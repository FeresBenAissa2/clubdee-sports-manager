'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

interface DateRangeFilterProps {
  currentStartDate?: string;
  currentEndDate?: string;
}

export function DateRangeFilter({ currentStartDate, currentEndDate }: DateRangeFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Initialize state with current values or empty strings
  const [startDate, setStartDate] = useState(currentStartDate || '');
  const [endDate, setEndDate] = useState(currentEndDate || '');

  const handleApplyFilter = () => {
    // Create new URLSearchParams
    const params = new URLSearchParams(searchParams.toString());
    
    // Update or remove start date
    if (startDate) {
      params.set('startDate', startDate);
    } else {
      params.delete('startDate');
    }
    
    // Update or remove end date
    if (endDate) {
      params.set('endDate', endDate);
    } else {
      params.delete('endDate');
    }
    
    // Navigate with new params
    router.push(`?${params.toString()}`);
  };

  const handleClearFilter = () => {
    // Clear state
    setStartDate('');
    setEndDate('');
    
    // Remove date params from URL
    const params = new URLSearchParams(searchParams.toString());
    params.delete('startDate');
    params.delete('endDate');
    
    // Navigate without date params
    router.push(`?${params.toString()}`);
  };

  const hasActiveFilter = currentStartDate || currentEndDate;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Start Date */}
        <div className="space-y-2">
          <Label htmlFor="startDate">Start date</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            max={endDate || undefined}
          />
        </div>

        {/* End Date */}
        <div className="space-y-2">
          <Label htmlFor="endDate">End date</Label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate || undefined}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={handleApplyFilter} className="flex-1 md:flex-none">
          Apply filters
        </Button>
        
        {hasActiveFilter && (
          <Button
            onClick={handleClearFilter}
            variant="outline"
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Active Filter Display */}
      {hasActiveFilter && (
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">Selected range: </span>
          {currentStartDate && (
            <span>
              {new Date(currentStartDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          )}
          {currentStartDate && currentEndDate && <span> - </span>}
          {currentEndDate && (
            <span>
              {new Date(currentEndDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
