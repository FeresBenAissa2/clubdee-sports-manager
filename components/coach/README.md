# Coach Components

## SessionForm

A form component for coaches to create new training sessions.

### Features

- Client-side validation for all fields
- Date validation (prevents creating sessions in the past)
- Time validation (ensures start time is before end time)
- Success/error message display
- Loading states during submission
- Automatic form reset on success

### Usage

#### Basic Usage

```tsx
import { SessionForm } from '@/components/coach/SessionForm';

export default function CreateSessionPage() {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Create training session</h1>
      <SessionForm />
    </div>
  );
}
```

#### With Dialog

```tsx
'use client';

import { useState } from 'react';
import { SessionForm } from '@/components/coach/SessionForm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function SessionsPage() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Button onClick={() => setOpen(true)}>
        Create training session
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create new training session</DialogTitle>
          </DialogHeader>
          <SessionForm
            onSuccess={() => setOpen(false)}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

#### With Custom Callbacks

```tsx
import { SessionForm } from '@/components/coach/SessionForm';
import { useRouter } from 'next/navigation';

export default function CreateSessionPage() {
  const router = useRouter();

  const handleSuccess = () => {
    // Custom success handling
    console.log('Session created successfully!');
    router.push('/dashboard/coach/sessions');
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <SessionForm
      onSuccess={handleSuccess}
      onCancel={handleCancel}
    />
  );
}
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onSuccess` | `() => void` | No | Callback function called when session is created successfully |
| `onCancel` | `() => void` | No | Callback function called when cancel button is clicked |

### Form Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `title` | text | Yes | Must not be empty |
| `description` | textarea | No | Optional field |
| `session_date` | date | Yes | Must not be in the past |
| `start_time` | time | Yes | Must be before end_time |
| `end_time` | time | Yes | Must be after start_time |
| `location` | text | Yes | Must not be empty |

### Validation Rules

1. **Date Validation**: Session date cannot be in the past
2. **Time Validation**: Start time must be before end time
3. **Required Fields**: Title, date, start time, end time, and location are required
4. **Trimming**: Title and location are trimmed of whitespace

### Error Messages

All error messages are displayed in English:

- `Please enter session title`
- `Please select date`
- `Please select start time`
- `Please select end time`
- `Please enter location`
- `Cannot create session in the past`
- `Start time must be before end time`

### Success Message

- `Session created successfully!`

### Server Action

The form uses the `createSession` server action from `@/lib/coach/session-actions`:

```typescript
createSession({
  title: string;
  description?: string;
  session_date: string;
  start_time: string;
  end_time: string;
  location: string;
})
```

### Requirements

Implements requirement **AC1** from the Training Attendance System specification:
- Coach can create training sessions
- Form validation ensures data integrity
- Success/error feedback for user experience
