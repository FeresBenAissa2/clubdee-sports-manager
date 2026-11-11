import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CheckInButton } from '../CheckInButton';
import * as attendanceActions from '@/lib/athlete/attendance-actions';
import { ToastProvider } from '@/components/ui/toast';
import React from 'react';

// Mock the attendance actions
vi.mock('@/lib/athlete/attendance-actions', () => ({
  athleteCheckIn: vi.fn(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

// Wrapper component with providers
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
);

const renderWithProviders = (ui: React.ReactElement) => {
  return render(ui, { wrapper: TestWrapper });
};

describe('CheckInButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders check-in button', () => {
    const now = new Date();
    const sessionDate = now.toISOString().split('T')[0];
    const sessionTime = now.toTimeString().split(' ')[0];

    renderWithProviders(
      <CheckInButton
        sessionId="test-session-id"
        sessionDate={sessionDate}
        startTime={sessionTime}
        sessionTitle="Test Session"
      />
    );

    expect(screen.getByRole('button', { name: /เช็คอิน/i })).toBeInTheDocument();
  });

  it('validates check-in time window - too early', () => {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 2);
    const sessionDate = futureDate.toISOString().split('T')[0];
    const sessionTime = futureDate.toTimeString().split(' ')[0];

    renderWithProviders(
      <CheckInButton
        sessionId="test-session-id"
        sessionDate={sessionDate}
        startTime={sessionTime}
      />
    );

    const button = screen.getByRole('button', { name: /เช็คอิน/i });
    expect(button).toBeDisabled();
    expect(screen.getByText(/ยังไม่ถึงเวลาเช็คอิน/i)).toBeInTheDocument();
  });

  it('validates check-in time window - too late', () => {
    const pastDate = new Date();
    pastDate.setHours(pastDate.getHours() - 2);
    const sessionDate = pastDate.toISOString().split('T')[0];
    const sessionTime = pastDate.toTimeString().split(' ')[0];

    renderWithProviders(
      <CheckInButton
        sessionId="test-session-id"
        sessionDate={sessionDate}
        startTime={sessionTime}
      />
    );

    const button = screen.getByRole('button', { name: /เช็คอิน/i });
    expect(button).toBeDisabled();
    expect(screen.getByText(/หมดเวลาเช็คอิน/i)).toBeInTheDocument();
  });

  it('shows confirmation dialog when check-in is clicked within valid window', async () => {
    // Set time to 10 minutes before session start (within 30 min window)
    const sessionDate = new Date();
    sessionDate.setMinutes(sessionDate.getMinutes() + 10);
    const dateStr = sessionDate.toISOString().split('T')[0];
    const timeStr = sessionDate.toTimeString().split(' ')[0];

    renderWithProviders(
      <CheckInButton
        sessionId="test-session-id"
        sessionDate={dateStr}
        startTime={timeStr}
        sessionTitle="Test Session"
      />
    );

    const button = screen.getByRole('button', { name: /เช็คอิน/i });
    expect(button).not.toBeDisabled();

    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/ยืนยันการเช็คอิน/i)).toBeInTheDocument();
    });
  });

  it('calls athleteCheckIn action when confirmed', async () => {
    const mockCheckIn = vi.mocked(attendanceActions.athleteCheckIn);
    mockCheckIn.mockResolvedValue({ success: true });

    // Set time to 10 minutes before session start
    const sessionDate = new Date();
    sessionDate.setMinutes(sessionDate.getMinutes() + 10);
    const dateStr = sessionDate.toISOString().split('T')[0];
    const timeStr = sessionDate.toTimeString().split(' ')[0];

    renderWithProviders(
      <CheckInButton
        sessionId="test-session-id"
        sessionDate={dateStr}
        startTime={timeStr}
        sessionTitle="Test Session"
      />
    );

    const button = screen.getByRole('button', { name: /เช็คอิน/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/ยืนยันการเช็คอิน/i)).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: /ยืนยัน/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockCheckIn).toHaveBeenCalledWith('test-session-id');
    });
  });

  it('displays error message when check-in fails', async () => {
    const mockCheckIn = vi.mocked(attendanceActions.athleteCheckIn);
    mockCheckIn.mockResolvedValue({ error: 'คุณได้เช็คอินแล้ว' });

    // Set time to 10 minutes before session start
    const sessionDate = new Date();
    sessionDate.setMinutes(sessionDate.getMinutes() + 10);
    const dateStr = sessionDate.toISOString().split('T')[0];
    const timeStr = sessionDate.toTimeString().split(' ')[0];

    renderWithProviders(
      <CheckInButton
        sessionId="test-session-id"
        sessionDate={dateStr}
        startTime={timeStr}
      />
    );

    const button = screen.getByRole('button', { name: /เช็คอิน/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/ยืนยันการเช็คอิน/i)).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: /ยืนยัน/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText(/คุณได้เช็คอินแล้ว/i)).toBeInTheDocument();
    });
  });

  it('shows success dialog when check-in succeeds', async () => {
    const mockCheckIn = vi.mocked(attendanceActions.athleteCheckIn);
    mockCheckIn.mockResolvedValue({ success: true });

    // Set time to 10 minutes before session start
    const sessionDate = new Date();
    sessionDate.setMinutes(sessionDate.getMinutes() + 10);
    const dateStr = sessionDate.toISOString().split('T')[0];
    const timeStr = sessionDate.toTimeString().split(' ')[0];

    renderWithProviders(
      <CheckInButton
        sessionId="test-session-id"
        sessionDate={dateStr}
        startTime={timeStr}
        sessionTitle="Test Session"
      />
    );

    const button = screen.getByRole('button', { name: /เช็คอิน/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/ยืนยันการเช็คอิน/i)).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: /ยืนยัน/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText(/เช็คอินสำเร็จ/i)).toBeInTheDocument();
    });
  });

  it('calls onSuccess callback when check-in succeeds', async () => {
    const mockCheckIn = vi.mocked(attendanceActions.athleteCheckIn);
    mockCheckIn.mockResolvedValue({ success: true });
    const onSuccess = vi.fn();

    // Set time to 10 minutes before session start
    const sessionDate = new Date();
    sessionDate.setMinutes(sessionDate.getMinutes() + 10);
    const dateStr = sessionDate.toISOString().split('T')[0];
    const timeStr = sessionDate.toTimeString().split(' ')[0];

    renderWithProviders(
      <CheckInButton
        sessionId="test-session-id"
        sessionDate={dateStr}
        startTime={timeStr}
        onSuccess={onSuccess}
      />
    );

    const button = screen.getByRole('button', { name: /เช็คอิน/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/ยืนยันการเช็คอิน/i)).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: /ยืนยัน/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('calls onError callback when check-in fails', async () => {
    const mockCheckIn = vi.mocked(attendanceActions.athleteCheckIn);
    mockCheckIn.mockResolvedValue({ error: 'Test error' });
    const onError = vi.fn();

    // Set time to 10 minutes before session start
    const sessionDate = new Date();
    sessionDate.setMinutes(sessionDate.getMinutes() + 10);
    const dateStr = sessionDate.toISOString().split('T')[0];
    const timeStr = sessionDate.toTimeString().split(' ')[0];

    renderWithProviders(
      <CheckInButton
        sessionId="test-session-id"
        sessionDate={dateStr}
        startTime={timeStr}
        onError={onError}
      />
    );

    const button = screen.getByRole('button', { name: /เช็คอิน/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/ยืนยันการเช็คอิน/i)).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: /ยืนยัน/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith('Test error');
    });
  });
});
