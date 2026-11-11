export * from './database.types';
export * from './integration';

// Additional application types
export interface User {
  id: string;
  email: string;
  role: 'admin' | 'coach' | 'athlete';
  created_at: string;
  updated_at: string;
}

export interface RegistrationData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phoneNumber: string;
  gender: 'male' | 'female' | 'other';
  clubId: string;
  nickname?: string;
  healthNotes?: string;
  profilePicture?: File;
}

export interface OTPVerificationData {
  email: string;
  token: string;
}

export interface AttendanceStats {
  athleteId: string;
  athleteName: string;
  totalSessions: number;
  attended: number;
  absent: number;
  late: number;
  attendanceRate: number;
}

export interface PerformanceStats {
  athleteId: string;
  testType: string;
  averageScore: number;
  bestScore: number;
  latestScore: number;
  improvement: number;
  totalTests: number;
}
