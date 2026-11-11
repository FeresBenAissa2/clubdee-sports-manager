/**
 * Integration Library
 * 
 * This module provides integration between Coach and Athlete dashboards,
 * enabling seamless data flow and real-time updates across features.
 * 
 * Features:
 * - Announcement Integration: Coach creates → Athlete sees
 * - Session Integration: Training schedule management
 * - Activity Integration: QR check-in for activities
 * - Performance Integration: Test results and improvement tracking
 * - Application Integration: Membership approval workflow
 * - Statistics Calculator: Attendance and progress stats
 * - Recommendation Engine: Smart recommendations for athletes
 */

// Re-export all integration types
export type {
  // Event Types
  IntegrationEventType,
  IntegrationEvent,
  
  // Announcement Types
  Announcement,
  AnnouncementReadStatus,
  AnnouncementIntegration,
  
  // Session Types
  TrainingSession,
  AttendanceRecord,
  SessionIntegration,
  
  // Activity Types
  Activity,
  CheckInResult,
  CheckInStatus,
  ActivityIntegration,
  
  // Performance Types
  PerformanceRecord,
  ImprovementResult,
  TrendData,
  PerformanceIntegration,
  
  // Application Types
  MembershipApplicationData,
  ApplicationIntegration,
  
  // Tournament Types
  Tournament,
  TournamentSelection,
  
  // Recommendation Types
  RecommendationPriority,
  Recommendation,
  RecommendationEngine,
  
  // Statistics Types
  AttendanceStats,
  StatisticsCalculator,
  
  // Dashboard State Types
  AthleteGoal,
  AthleteProfile,
  CoachProfile,
  AthleteDashboardState,
  CoachDashboardState,
} from '@/types/integration';

// Export error types
export { IntegrationErrorType, IntegrationError } from '@/types/integration';

// Integration modules
export {
  onAnnouncementCreated,
  onAnnouncementRead,
  getUnreadCount,
  getAnnouncementsWithReadStatus,
  isUrgentAnnouncement,
  getAnnouncementStyle,
  getPriorityBadge,
  announcementIntegration,
} from './announcement-integration';

// Session integration module
export {
  onSessionCreated,
  onAthleteCheckIn,
  onAttendanceRecorded,
  getTodaySessions,
  getTomorrowSessions,
  getUpcomingSessions,
  getAthleteSessionAttendance,
  isSessionToday,
  isSessionTomorrow,
} from './session-integration';

// Activity integration module
export {
  onActivityCreated,
  onQRCheckIn,
  getCheckInStatus,
  getUpcomingActivities,
  getTodayActivities,
  calculateRemainingTime,
  getActivityParticipants,
} from './activity-integration';

// Performance integration module
export {
  onPerformanceRecorded,
  checkImprovement,
  getPerformanceTrend,
  getAthletePerformanceRecords,
  getLatestPerformanceRecord,
  getAthleteTestTypes,
} from './performance-integration';

// Application integration module
export {
  onApplicationSubmitted,
  onApplicationApproved,
  onApplicationRejected,
  getPendingCount,
  getPendingApplications,
  hasClubAccess,
  getApplicationStatus,
} from './application-integration';

// Future integration modules will be exported here as they are implemented
// export * from './statistics-calculator';
// export * from './recommendation-engine';
