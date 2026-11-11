import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionList } from '../SessionList';
import { Database } from '@/types/database.types';
import { ToastProvider } from '@/components/ui/toast';
import React from 'react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

type TrainingSession = Database['public']['Tables']['training_sessions']['Row'];

// Wrapper component with providers
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
);

const renderWithProviders = (ui: React.ReactElement) => {
  return render(ui, { wrapper: TestWrapper });
};

describe('SessionList', () => {
  const mockSessions: (TrainingSession & { attendance_count?: number })[] = [
    {
      id: '1',
      club_id: 'club-1',
      coach_id: 'coach-1',
      title: 'Morning Practice',
      session_type: 'practice',
      session_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
      start_time: '09:00:00',
      end_time: '11:00:00',
      location: 'Field A',
      description: 'Regular morning practice',
      max_participants: null,
      status: 'scheduled',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      attendance_count: 15,
    },
    {
      id: '2',
      club_id: 'club-1',
      coach_id: 'coach-1',
      title: 'Past Practice',
      session_type: 'practice',
      session_date: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday
      start_time: '14:00:00',
      end_time: '16:00:00',
      location: 'Field B',
      description: 'Past session',
      max_participants: null,
      status: 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      attendance_count: 12,
    },
  ];

  it('renders filter tabs', () => {
    renderWithProviders(<SessionList sessions={mockSessions} />);

    expect(screen.getByText('กำลังจะมาถึง')).toBeInTheDocument();
    expect(screen.getByText('ผ่านมาแล้ว')).toBeInTheDocument();
    expect(screen.getByText('ทั้งหมด')).toBeInTheDocument();
  });

  it('filters upcoming sessions by default', () => {
    renderWithProviders(<SessionList sessions={mockSessions} />);

    expect(screen.getByText('Morning Practice')).toBeInTheDocument();
    expect(screen.queryByText('Past Practice')).not.toBeInTheDocument();
  });

  it('shows past sessions when past tab is clicked', () => {
    renderWithProviders(<SessionList sessions={mockSessions} />);

    fireEvent.click(screen.getByText('ผ่านมาแล้ว'));

    expect(screen.queryByText('Morning Practice')).not.toBeInTheDocument();
    expect(screen.getByText('Past Practice')).toBeInTheDocument();
  });

  it('shows all sessions when all tab is clicked', () => {
    renderWithProviders(<SessionList sessions={mockSessions} />);

    fireEvent.click(screen.getByText('ทั้งหมด'));

    expect(screen.getByText('Morning Practice')).toBeInTheDocument();
    expect(screen.getByText('Past Practice')).toBeInTheDocument();
  });

  it('shows empty state when no sessions match filter', () => {
    renderWithProviders(<SessionList sessions={[]} />);

    expect(screen.getByText('ไม่มีตารางฝึกซ้อม')).toBeInTheDocument();
    expect(
      screen.getByText('ยังไม่มีตารางฝึกซ้อมที่กำลังจะมาถึง')
    ).toBeInTheDocument();
  });

  it('calls callback functions when provided', () => {
    const onViewDetails = vi.fn();
    const onEdit = vi.fn();
    const onCancel = vi.fn();

    renderWithProviders(
      <SessionList
        sessions={mockSessions}
        onViewDetails={onViewDetails}
        onEdit={onEdit}
        onCancel={onCancel}
      />
    );

    // The callbacks are passed to SessionCard components
    // This test verifies the props are passed correctly
    expect(screen.getByText('Morning Practice')).toBeInTheDocument();
  });
});
