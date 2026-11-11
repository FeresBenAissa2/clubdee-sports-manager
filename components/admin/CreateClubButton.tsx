'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { CreateClubDialog } from './CreateClubDialog';

export function CreateClubButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Create Club
      </Button>
      <CreateClubDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
