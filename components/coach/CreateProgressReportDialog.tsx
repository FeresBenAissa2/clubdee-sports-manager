'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { FileText, Plus, X } from 'lucide-react';
import { createProgressReport, publishProgressReport } from '@/lib/progress/actions';
import { useToast } from '@/hooks/useToast';

interface CreateProgressReportDialogProps {
  athleteId: string;
  athleteName: string;
}

export default function CreateProgressReportDialog({
  athleteId,
  athleteName,
}: CreateProgressReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    reportType: 'monthly' as 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom',
    periodStart: '',
    periodEnd: '',
    title: '',
    summary: '',
    coachComments: '',
  });

  const [highlights, setHighlights] = useState<string[]>(['']);
  const [improvements, setImprovements] = useState<string[]>(['']);

  const handleSubmit = async (publish: boolean = false) => {
    if (!formData.title || !formData.periodStart || !formData.periodEnd) {
      toast({
        title: 'Please complete all required fields',
        description: 'Please enter a report name and time period',
        variant: 'error',
      });
      return;
    }

    setLoading(true);

    try {
      const result = await createProgressReport({
        athleteId,
        reportType: formData.reportType,
        periodStart: formData.periodStart,
        periodEnd: formData.periodEnd,
        title: formData.title,
        summary: formData.summary || undefined,
        highlights: highlights.filter((h) => h.trim() !== ''),
        areasForImprovement: improvements.filter((i) => i.trim() !== ''),
        coachComments: formData.coachComments || undefined,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      // Publish if requested
      if (publish && result.data && 'id' in result.data) {
        const publishResult = await publishProgressReport(result.data.id);
        if (!publishResult.success) {
          throw new Error(publishResult.error);
        }
      }

      toast({
        title: publish ? 'Report published' : 'Report saved',
        description: publish
          ? 'The report is now available to Athletes.'
          : 'The report is saved as a Draft.',
      });

      setOpen(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: 'An error occurred',
        description: error.message || 'Could not generate report',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      reportType: 'monthly',
      periodStart: '',
      periodEnd: '',
      title: '',
      summary: '',
      coachComments: '',
    });
    setHighlights(['']);
    setImprovements(['']);
  };

  const addHighlight = () => {
    setHighlights([...highlights, '']);
  };

  const removeHighlight = (index: number) => {
    setHighlights(highlights.filter((_, i) => i !== index));
  };

  const updateHighlight = (index: number, value: string) => {
    const newHighlights = [...highlights];
    newHighlights[index] = value;
    setHighlights(newHighlights);
  };

  const addImprovement = () => {
    setImprovements([...improvements, '']);
  };

  const removeImprovement = (index: number) => {
    setImprovements(improvements.filter((_, i) => i !== index));
  };

  const updateImprovement = (index: number, value: string) => {
    const newImprovements = [...improvements];
    newImprovements[index] = value;
    setImprovements(newImprovements);
  };

  // Auto-generate title based on report type and period
  const generateTitle = () => {
    if (formData.periodStart && formData.reportType) {
      const date = new Date(formData.periodStart);
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      
      const typeLabels: Record<string, string> = {
        weekly: 'Weekly',
        monthly: 'Monthly',
        quarterly: 'Quarterly',
        yearly: 'Yearly',
        custom: 'Report',
      };
      
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear() + 543;
      
      return `Progress Report ${typeLabels[formData.reportType]} - ${month} ${year}`;
    }
    return '';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <FileText className="h-4 w-4 mr-2" />
          Generate reportProgress
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate reportProgress</DialogTitle>
          <DialogDescription>
            Generate reportProgressfor {athleteName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Report Type */}
          <div className="space-y-2">
            <Label htmlFor="reportType">Report type</Label>
            <Select
              value={formData.reportType}
              onValueChange={(value: any) =>
                setFormData({ ...formData, reportType: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Period */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="periodStart">Start date</Label>
              <Input
                id="periodStart"
                type="date"
                value={formData.periodStart}
                onChange={(e) =>
                  setFormData({ ...formData, periodStart: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="periodEnd">End date</Label>
              <Input
                id="periodEnd"
                type="date"
                value={formData.periodEnd}
                onChange={(e) =>
                  setFormData({ ...formData, periodEnd: e.target.value })
                }
              />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="title">Report name</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setFormData({ ...formData, title: generateTitle() })
                }
              >
                Generate name automatically
              </Button>
            </div>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Ex: Monthly Progress Report - January 2025"
            />
          </div>

          {/* Summary */}
          <div className="space-y-2">
            <Label htmlFor="summary">Summary</Label>
            <Textarea
              id="summary"
              value={formData.summary}
              onChange={(e) =>
                setFormData({ ...formData, summary: e.target.value })
              }
              placeholder="Summary of Athletes' Progress during this Time Period"
              rows={3}
            />
          </div>

          {/* Highlights */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Strengths</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addHighlight}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {highlights.map((highlight, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={highlight}
                    onChange={(e) => updateHighlight(index, e.target.value)}
                    placeholder="e.g. 95% Consistent Attended"
                  />
                  {highlights.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeHighlight(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Areas for Improvement */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Areas to improve</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addImprovement}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {improvements.map((improvement, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={improvement}
                    onChange={(e) => updateImprovement(index, e.target.value)}
                    placeholder="For example, you should do more leg strength training."
                  />
                  {improvements.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeImprovement(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Coach Comments */}
          <div className="space-y-2">
            <Label htmlFor="coachComments">Coach comments</Label>
            <Textarea
              id="coachComments"
              value={formData.coachComments}
              onChange={(e) =>
                setFormData({ ...formData, coachComments: e.target.value })
              }
              placeholder="Additional Suggested Comments and Words from Coach"
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSubmit(false)}
            disabled={loading}
          >
            Save draft
          </Button>
          <Button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create and publish'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
