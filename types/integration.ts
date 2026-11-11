/**
 * Integration Types
 * Types for feature integration between Coach and Athlete dashboards
 */

import { ReactNode } from 'react';
import { 
  AnnouncementPriority, 
  AttendanceStatus, 
  ApplicationStatus,
  UserRole 
} from './database.types';

// ============================================
// Event Types
// ============================================

export type IntegrationEventType =
  | 'announcement.created'
  | 'announcement.read'
  | 'session.created'
  | 'session.checkin'
  | 'attendance.recorded'
  | 'activity.created'
  | 'activity.checkin'
  | 'performance.recorded'
  | 'application.submitted'
  | 'application.approved'
  | 'application.rejected'
  | 'tournament.created'
  | 'tournament.athlete_selected';

export interface IntegrationEvent {
  id: string;
  type: IntegrationEventType;
  source: 'coach' | 'athlete';
  clubId: string;
  payload: Record<string, unknown>;
  timestamp: Date;
}

// ============================================
// Announcement Integration Types
// ============================================

export interface Announcement {
  id: string;
  clubId: string | null;
  authorId: string;
  authorRole: UserRole;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  publishedAt: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementReadStatus {
  announcementId: string;
  userId: string;
  readAt: string;
}

export interface AnnouncementIntegration {
  onAnnouncementCreated(announcement: Announcement): Promise<void>;
  onAnnouncementRead(announcementId: string, userId: string): Promise<void>;
  getUnreadCount(userId: string, clubId: string): Promise<number>;
}

// ============================================
// Training Session Integration Types
// ============================================

export interface TrainingSession {
  id: string;
  clubId: string;
  coachId: string | null;
  title: string;
  description: string | null;
  sessionDate: string;
  startTime: string;
  endTime: string;
  location: string;
  maxParticipants: number | null;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  qrCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  athleteId: string;
  status: AttendanceStatus;
  checkInTime: string | null;
  checkInMethod: 'manual' | 'qr' | 'auto';
  markedBy: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionIntegration {
  onSessionCreated(session: TrainingSession): Promise<void>;
  onAthleteCheckIn(sessionId: string, athleteId: string): Promise<void>;
  onAttendanceRecorded(attendance: AttendanceRecord): Promise<void>;
  getTodaySessions(clubId: string): Promise<TrainingSession[]>;
}

// ============================================
// Activity Integration Types
// ============================================

export interface Activity {
  id: string;
  clubId: string;
  coachId: string;
  title: string;
  description: string | null;
  activityDate: string;
  startTime: string;
  endTime: string;
  location: string;
  qrCode: string;
  deadline: string | null;
  maxParticipants: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CheckInResult {
  success: boolean;
  message: string;
  checkInTime?: string;
}

export interface CheckInStatus {
  isCheckedIn: boolean;
  checkInTime: string | null;
}

export interface ActivityIntegration {
  onActivityCreated(activity: Activity): Promise<void>;
  onQRCheckIn(activityId: string, athleteId: string): Promise<CheckInResult>;
  getCheckInStatus(activityId: string, athleteId: string): Promise<CheckInStatus>;
}

// ============================================
// Performance Integration Types
// ============================================

export interface PerformanceRecord {
  id: string;
  athleteId: string;
  coachId: string;
  testType: string;
  testName: string;
  score: number;
  unit: string;
  testDate: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ImprovementResult {
  hasImproved: boolean;
  testType: string;
  previousScore: number;
  currentScore: number;
  improvementPercentage: number;
}

export interface TrendData {
  testType: string;
  dataPoints: Array<{
    date: string;
    score: number;
  }>;
  trend: 'improving' | 'declining' | 'stable';
}

export interface PerformanceIntegration {
  onPerformanceRecorded(record: PerformanceRecord): Promise<void>;
  checkImprovement(athleteId: string): Promise<ImprovementResult | null>;
  getPerformanceTrend(athleteId: string, testType: string): Promise<TrendData>;
}

// ============================================
// Application Integration Types
// ============================================

export interface MembershipApplicationData {
  id: string;
  userId: string;
  clubId: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationIntegration {
  onApplicationSubmitted(application: MembershipApplicationData): Promise<void>;
  onApplicationApproved(applicationId: string): Promise<void>;
  onApplicationRejected(applicationId: string, reason: string): Promise<void>;
  getPendingCount(clubId: string): Promise<number>;
}

// ============================================
// Tournament Integration Types
// ============================================

export interface Tournament {
  id: string;
  clubId: string;
  coachId: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  location: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface TournamentSelection {
  tournamentId: string;
  athleteId: string;
  selectedAt: string;
  selectedBy: string;
}

// ============================================
// Recommendation Types
// ============================================

export type RecommendationPriority = 'high' | 'medium' | 'low';

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  action: string;
  href: string;
  priority: RecommendationPriority;
  icon?: ReactNode;
  type: 'session' | 'attendance' | 'performance' | 'announcement' | 'goal' | 'general';
}

export interface RecommendationEngine {
  generateRecommendations(athleteId: string): Promise<Recommendation[]>;
  sortByPriority(recommendations: Recommendation[]): Recommendation[];
}

// ============================================
// Statistics Types
// ============================================

export interface AttendanceStats {
  totalAttendance: number;
  monthlyAttendance: number;
  attendanceRate: number;
}

export interface StatisticsCalculator {
  calculateAttendanceStats(athleteId: string): Promise<AttendanceStats>;
  calculateProgress(athleteId: string): Promise<number>;
  calculateAttendanceRate(athleteId: string): Promise<number>;
}

// ============================================
// Dashboard State Types
// ============================================

export interface AthleteGoal {
  id: string;
  athleteId: string;
  coachId: string;
  title: string;
  description: string | null;
  targetDate: string | null;
  progress: number;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface AthleteProfile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  clubId: string | null;
  profilePictureUrl: string | null;
}

export interface CoachProfile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  clubId: string | null;
}

export interface AthleteDashboardState {
  profile: AthleteProfile;
  stats: {
    totalAttendance: number;
    monthlyAttendance: number;
    totalPerformance: number;
    progressPercentage: number;
  };
  recommendations: Recommendation[];
  unreadAnnouncements: number;
  upcomingSessions: number;
  goals: AthleteGoal[];
}

export interface CoachDashboardState {
  profile: CoachProfile;
  stats: {
    totalAthletes: number;
    totalSessions: number;
    totalPerformanceRecords: number;
  };
  pendingApplications: number;
}

// ============================================
// Error Types
// ============================================

export enum IntegrationErrorType {
  CLUB_MISMATCH = 'CLUB_MISMATCH',
  ATHLETE_NOT_FOUND = 'ATHLETE_NOT_FOUND',
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  ACTIVITY_NOT_FOUND = 'ACTIVITY_NOT_FOUND',
  ALREADY_CHECKED_IN = 'ALREADY_CHECKED_IN',
  CHECK_IN_WINDOW_CLOSED = 'CHECK_IN_WINDOW_CLOSED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  DATABASE_ERROR = 'DATABASE_ERROR',
}

export class IntegrationError extends Error {
  constructor(
    public type: IntegrationErrorType,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'IntegrationError';
  }
}
