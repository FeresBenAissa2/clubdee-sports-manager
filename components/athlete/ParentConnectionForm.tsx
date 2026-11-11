'use client';

import { useState } from 'react';
import { addParentConnection, type AddParentInput } from '@/lib/parent/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { UserPlus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

export function ParentConnectionForm() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<AddParentInput>({
    parentEmail: '',
    parentName: '',
    relationship: 'father',
    phoneNumber: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.parentEmail || !formData.parentName) {
      toast({
        title: 'Please fill in all required fields',
        description: 'Parent email and name are required',
        variant: 'error',
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.parentEmail)) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email',
        variant: 'error',
      });
      return;
    }

    setLoading(true);
    
    try {
      const result = await addParentConnection(formData);
      
      if (result.success) {
        toast({
          title: 'Parent added successfully',
          description: result.message || 'Ask the parent to check their email to confirm',
        });
        
        // Reset form
        setFormData({
          parentEmail: '',
          parentName: '',
          relationship: 'father',
          phoneNumber: '',
        });
        
        setOpen(false);
      } else {
        toast({
          title: 'An error occurred',
          description: result.error || 'Could not add parent',
          variant: 'error',
        });
      }
    } catch (error) {
      toast({
        title: 'An error occurred',
        description: 'Could not add parent',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <UserPlus className="w-4 h-4 mr-2" />
          Add parent
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add parent</DialogTitle>
            <DialogDescription>
              Add a parent email to receive notifications about your progress
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="parentEmail">
                Parent email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="parentEmail"
                type="email"
                placeholder="parent@example.com"
                value={formData.parentEmail}
                onChange={(e) =>
                  setFormData({ ...formData, parentEmail: e.target.value })
                }
                required
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="parentName">
                Parent name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="parentName"
                type="text"
                placeholder="e.g. Somchai Kind"
                value={formData.parentName}
                onChange={(e) =>
                  setFormData({ ...formData, parentName: e.target.value })
                }
                required
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="relationship">
                Relationship <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.relationship}
                onValueChange={(value: 'father' | 'mother' | 'guardian') =>
                  setFormData({ ...formData, relationship: value })
                }
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="father">Father</SelectItem>
                  <SelectItem value="mother">Mother</SelectItem>
                  <SelectItem value="guardian">Parent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phoneNumber">Phone number (Optional)</Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="08X-XXX-XXXX"
                value={formData.phoneNumber}
                onChange={(e) =>
                  setFormData({ ...formData, phoneNumber: e.target.value })
                }
                disabled={loading}
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
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add parent
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
