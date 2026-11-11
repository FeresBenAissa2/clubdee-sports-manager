import { describe, it, expect } from 'vitest';

/**
 * Validation Tests for Training Attendance System
 * 
 * Tests validation rules for:
 * - Session date validation (not in past)
 * - Time range validation (start < end)
 * - Leave request validation (min 10 chars, 2 hours before)
 * - Check-in time window validation
 * 
 * Requirements: AC1, AC2, BR1, BR2
 */

// Validation helper functions extracted from business logic
export function validateSessionDate(sessionDate: string): { valid: boolean; error?: string } {
  const date = new Date(sessionDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (date < today) {
    return { valid: false, error: 'ไม่สามารถสร้างตารางในอดีตได้' };
  }
  
  return { valid: true };
}

export function validateTimeRange(startTime: string, endTime: string): { valid: boolean; error?: string } {
  if (startTime >= endTime) {
    return { valid: false, error: 'เวลาเริ่มต้องน้อยกว่าเวลาสิ้นสุด' };
  }
  
  return { valid: true };
}

export function validateLeaveRequestReason(reason: string): { valid: boolean; error?: string } {
  if (!reason || reason.trim().length < 10) {
    return { valid: false, error: 'กรุณาระบุเหตุผลอย่างน้อย 10 ตัวอักษร' };
  }
  
  return { valid: true };
}

export function validateLeaveRequestTiming(
  sessionDate: string,
  startTime: string,
  currentTime: Date = new Date()
): { valid: boolean; error?: string } {
  const sessionDateTime = new Date(`${sessionDate}T${startTime}`);
  const twoHoursFromNow = new Date(currentTime.getTime() + 2 * 60 * 60 * 1000);

  if (sessionDateTime < twoHoursFromNow) {
    return { valid: false, error: 'ต้องแจ้งลาล่วงหน้าอย่างน้อย 2 ชั่วโมงก่อนเวลาเริ่ม' };
  }
  
  return { valid: true };
}

export function validateCheckInTimeWindow(
  sessionDate: string,
  startTime: string,
  currentTime: Date = new Date()
): { valid: boolean; error?: string; status?: 'early' | 'on-time' | 'late' | 'too-late' } {
  const sessionDateTime = new Date(`${sessionDate}T${startTime}`);
  
  // 30 minutes before
  const earliestCheckIn = new Date(sessionDateTime.getTime() - 30 * 60 * 1000);
  // 15 minutes after
  const latestCheckIn = new Date(sessionDateTime.getTime() + 15 * 60 * 1000);

  if (currentTime < earliestCheckIn) {
    return { 
      valid: false, 
      error: 'ยังไม่ถึงเวลาเช็คอิน (สามารถเช็คอินได้ 30 นาทีก่อนเวลาเริ่ม)',
      status: 'early'
    };
  }

  if (currentTime > latestCheckIn) {
    return { 
      valid: false, 
      error: 'หมดเวลาเช็คอินแล้ว (สามารถเช็คอินได้จนถึง 15 นาทีหลังเวลาเริ่ม)',
      status: 'too-late'
    };
  }

  // Determine if on-time or late
  const status = currentTime <= sessionDateTime ? 'on-time' : 'late';
  
  return { valid: true, status };
}

describe('Session Date Validation (AC1)', () => {
  it('should reject dates in the past', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateString = yesterday.toISOString().split('T')[0];
    
    const result = validateSessionDate(dateString);
    
    expect(result.valid).toBe(false);
    expect(result.error).toBe('ไม่สามารถสร้างตารางในอดีตได้');
  });

  it('should accept today\'s date', () => {
    const today = new Date().toISOString().split('T')[0];
    
    const result = validateSessionDate(today);
    
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should accept future dates', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];
    
    const result = validateSessionDate(dateString);
    
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should accept dates far in the future', () => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const dateString = nextMonth.toISOString().split('T')[0];
    
    const result = validateSessionDate(dateString);
    
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

describe('Time Range Validation (AC1)', () => {
  it('should reject when start time equals end time', () => {
    const result = validateTimeRange('14:00', '14:00');
    
    expect(result.valid).toBe(false);
    expect(result.error).toBe('เวลาเริ่มต้องน้อยกว่าเวลาสิ้นสุด');
  });

  it('should reject when start time is after end time', () => {
    const result = validateTimeRange('16:00', '14:00');
    
    expect(result.valid).toBe(false);
    expect(result.error).toBe('เวลาเริ่มต้องน้อยกว่าเวลาสิ้นสุด');
  });

  it('should accept when start time is before end time', () => {
    const result = validateTimeRange('14:00', '16:00');
    
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should accept valid time ranges across different hours', () => {
    const result = validateTimeRange('09:00', '17:00');
    
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should accept time ranges with minutes', () => {
    const result = validateTimeRange('14:30', '16:45');
    
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

describe('Leave Request Reason Validation (BR2)', () => {
  it('should reject empty reason', () => {
    const result = validateLeaveRequestReason('');
    
    expect(result.valid).toBe(false);
    expect(result.error).toBe('กรุณาระบุเหตุผลอย่างน้อย 10 ตัวอักษร');
  });

  it('should reject reason with only whitespace', () => {
    const result = validateLeaveRequestReason('   ');
    
    expect(result.valid).toBe(false);
    expect(result.error).toBe('กรุณาระบุเหตุผลอย่างน้อย 10 ตัวอักษร');
  });

  it('should reject reason with less than 10 characters', () => {
    const result = validateLeaveRequestReason('ป่วย');
    
    expect(result.valid).toBe(false);
    expect(result.error).toBe('กรุณาระบุเหตุผลอย่างน้อย 10 ตัวอักษร');
  });

  it('should accept reason with exactly 10 characters', () => {
    const result = validateLeaveRequestReason('1234567890');
    
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should accept reason with more than 10 characters', () => {
    const result = validateLeaveRequestReason('ป่วยเป็นไข้หวัดต้องพักผ่อน');
    
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should trim whitespace and validate correctly', () => {
    const result = validateLeaveRequestReason('  ป่วยเป็นไข้  ');
    
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

describe('Leave Request Timing Validation (BR2)', () => {
  it('should reject leave request less than 2 hours before session', () => {
    const now = new Date('2024-01-15T14:00:00');
    const sessionDate = '2024-01-15';
    const startTime = '15:30:00'; // 1.5 hours from now
    
    const result = validateLeaveRequestTiming(sessionDate, startTime, now);
    
    expect(result.valid).toBe(false);
    expect(result.error).toBe('ต้องแจ้งลาล่วงหน้าอย่างน้อย 2 ชั่วโมงก่อนเวลาเริ่ม');
  });

  it('should accept leave request exactly 2 hours before session', () => {
    const now = new Date('2024-01-15T14:00:00');
    const sessionDate = '2024-01-15';
    const startTime = '16:00:00'; // exactly 2 hours from now
    
    const result = validateLeaveRequestTiming(sessionDate, startTime, now);
    
    // The implementation allows exactly 2 hours (uses < not <=)
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should accept leave request more than 2 hours before session', () => {
    const now = new Date('2024-01-15T14:00:00');
    const sessionDate = '2024-01-15';
    const startTime = '17:00:00'; // 3 hours from now
    
    const result = validateLeaveRequestTiming(sessionDate, startTime, now);
    
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should accept leave request days before session', () => {
    const now = new Date('2024-01-15T14:00:00');
    const sessionDate = '2024-01-20';
    const startTime = '16:00:00'; // 5 days from now
    
    const result = validateLeaveRequestTiming(sessionDate, startTime, now);
    
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject leave request for past session', () => {
    const now = new Date('2024-01-15T14:00:00');
    const sessionDate = '2024-01-14';
    const startTime = '16:00:00'; // yesterday
    
    const result = validateLeaveRequestTiming(sessionDate, startTime, now);
    
    expect(result.valid).toBe(false);
    expect(result.error).toBe('ต้องแจ้งลาล่วงหน้าอย่างน้อย 2 ชั่วโมงก่อนเวลาเริ่ม');
  });
});

describe('Check-in Time Window Validation (BR1)', () => {
  it('should reject check-in more than 30 minutes before session', () => {
    const now = new Date('2024-01-15T15:00:00');
    const sessionDate = '2024-01-15';
    const startTime = '16:00:00'; // 60 minutes from now
    
    const result = validateCheckInTimeWindow(sessionDate, startTime, now);
    
    expect(result.valid).toBe(false);
    expect(result.status).toBe('early');
    expect(result.error).toBe('ยังไม่ถึงเวลาเช็คอิน (สามารถเช็คอินได้ 30 นาทีก่อนเวลาเริ่ม)');
  });

  it('should accept check-in exactly 30 minutes before session', () => {
    const now = new Date('2024-01-15T15:30:00');
    const sessionDate = '2024-01-15';
    const startTime = '16:00:00'; // exactly 30 minutes from now
    
    const result = validateCheckInTimeWindow(sessionDate, startTime, now);
    
    expect(result.valid).toBe(true);
    expect(result.status).toBe('on-time');
    expect(result.error).toBeUndefined();
  });

  it('should accept check-in within 30 minutes before session', () => {
    const now = new Date('2024-01-15T15:45:00');
    const sessionDate = '2024-01-15';
    const startTime = '16:00:00'; // 15 minutes from now
    
    const result = validateCheckInTimeWindow(sessionDate, startTime, now);
    
    expect(result.valid).toBe(true);
    expect(result.status).toBe('on-time');
    expect(result.error).toBeUndefined();
  });

  it('should accept check-in at exact start time', () => {
    const now = new Date('2024-01-15T16:00:00');
    const sessionDate = '2024-01-15';
    const startTime = '16:00:00'; // exactly at start time
    
    const result = validateCheckInTimeWindow(sessionDate, startTime, now);
    
    expect(result.valid).toBe(true);
    expect(result.status).toBe('on-time');
    expect(result.error).toBeUndefined();
  });

  it('should accept check-in within 15 minutes after session start (marked as late)', () => {
    const now = new Date('2024-01-15T16:10:00');
    const sessionDate = '2024-01-15';
    const startTime = '16:00:00'; // 10 minutes after start
    
    const result = validateCheckInTimeWindow(sessionDate, startTime, now);
    
    expect(result.valid).toBe(true);
    expect(result.status).toBe('late');
    expect(result.error).toBeUndefined();
  });

  it('should accept check-in exactly 15 minutes after session start', () => {
    const now = new Date('2024-01-15T16:15:00');
    const sessionDate = '2024-01-15';
    const startTime = '16:00:00'; // exactly 15 minutes after start
    
    const result = validateCheckInTimeWindow(sessionDate, startTime, now);
    
    expect(result.valid).toBe(true);
    expect(result.status).toBe('late');
    expect(result.error).toBeUndefined();
  });

  it('should reject check-in more than 15 minutes after session start', () => {
    const now = new Date('2024-01-15T16:20:00');
    const sessionDate = '2024-01-15';
    const startTime = '16:00:00'; // 20 minutes after start
    
    const result = validateCheckInTimeWindow(sessionDate, startTime, now);
    
    expect(result.valid).toBe(false);
    expect(result.status).toBe('too-late');
    expect(result.error).toBe('หมดเวลาเช็คอินแล้ว (สามารถเช็คอินได้จนถึง 15 นาทีหลังเวลาเริ่ม)');
  });

  it('should handle check-in window across midnight', () => {
    const now = new Date('2024-01-15T23:50:00');
    const sessionDate = '2024-01-16';
    const startTime = '00:00:00'; // midnight
    
    const result = validateCheckInTimeWindow(sessionDate, startTime, now);
    
    expect(result.valid).toBe(true);
    expect(result.status).toBe('on-time');
    expect(result.error).toBeUndefined();
  });
});
