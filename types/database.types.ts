// Database types will be generated from Supabase
// Run: npx supabase gen types typescript --project-id <project-id> > types/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = 'admin' | 'coach' | 'athlete';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export type CheckInMethod = 'manual' | 'qr' | 'auto';

export type AnnouncementPriority = 'low' | 'normal' | 'high' | 'urgent';

export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected';

// Membership Application Types
export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'info_requested';

// Progress Report Types
export type ReportType = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
export type ReportStatus = 'draft' | 'published' | 'archived';
export type PeriodType = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

// Membership Status Types
export type MembershipStatus = 'pending' | 'active' | 'rejected' | 'suspended';

export type DocumentType = 'id_card' | 'house_registration' | 'birth_certificate' | 'parent_id_card' | 'parent_house_registration';

export interface PersonalInfo {
  full_name: string;
  nickname?: string;
  gender: 'male' | 'female' | 'other';
  date_of_birth: string;
  phone_number: string;
  address: string;
  emergency_contact: string;
  blood_type?: string;
  medical_conditions?: string;
}

export interface DocumentEntry {
  type: DocumentType;
  url: string;
  uploaded_at: string;
  file_name: string;
  file_size: number;
  is_verified?: boolean;
}

export interface ReviewInfo {
  reviewed_by: string;
  reviewed_at: string;
  reviewer_role: UserRole;
  notes?: string;
  requested_changes?: string[];
}

export interface ActivityLogEntry {
  timestamp: string;
  action: string;
  by_user: string;
  by_role: UserRole;
  details?: Record<string, any>;
  from?: string;
  to?: string;
  notes?: string;
}

export interface MembershipApplication {
  id: string;
  user_id: string;
  club_id: string;
  personal_info: PersonalInfo;
  documents: DocumentEntry[];
  status: ApplicationStatus;
  review_info?: ReviewInfo;
  activity_log: ActivityLogEntry[];
  profile_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      clubs: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          sport_type: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          sport_type: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          sport_type?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      athletes: {
        Row: {
          id: string;
          user_id: string;
          club_id: string;
          first_name: string;
          last_name: string;
          nickname: string | null;
          date_of_birth: string;
          phone_number: string;
          email: string;
          gender: string;
          health_notes: string | null;
          profile_picture_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          club_id: string;
          first_name: string;
          last_name: string;
          nickname?: string | null;
          date_of_birth: string;
          phone_number: string;
          email: string;
          gender: string;
          health_notes?: string | null;
          profile_picture_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          club_id?: string;
          first_name?: string;
          last_name?: string;
          nickname?: string | null;
          date_of_birth?: string;
          phone_number?: string;
          email?: string;
          gender?: string;
          health_notes?: string | null;
          profile_picture_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      coaches: {
        Row: {
          id: string;
          user_id: string;
          club_id: string;
          first_name: string;
          last_name: string;
          phone_number: string;
          email: string;
          certification_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          club_id: string;
          first_name: string;
          last_name: string;
          phone_number: string;
          email: string;
          certification_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          club_id?: string;
          first_name?: string;
          last_name?: string;
          phone_number?: string;
          email?: string;
          certification_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      training_sessions: {
        Row: {
          id: string;
          club_id: string;
          coach_id: string | null;
          title: string;
          description: string | null;
          session_date: string;
          start_time: string;
          end_time: string;
          location: string;
          max_participants: number | null;
          status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
          qr_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          coach_id?: string | null;
          title: string;
          description?: string | null;
          session_date: string;
          start_time: string;
          end_time: string;
          location: string;
          max_participants?: number | null;
          status?: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
          qr_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          club_id?: string;
          coach_id?: string | null;
          title?: string;
          description?: string | null;
          session_date?: string;
          start_time?: string;
          end_time?: string;
          location?: string;
          max_participants?: number | null;
          status?: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
          qr_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      attendance: {
        Row: {
          id: string;
          session_id: string;
          athlete_id: string;
          status: AttendanceStatus;
          check_in_time: string | null;
          check_in_method: CheckInMethod;
          marked_by: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          athlete_id: string;
          status: AttendanceStatus;
          check_in_time?: string | null;
          check_in_method?: CheckInMethod;
          marked_by?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          athlete_id?: string;
          status?: AttendanceStatus;
          check_in_time?: string | null;
          check_in_method?: CheckInMethod;
          marked_by?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      performance_records: {
        Row: {
          id: string;
          athlete_id: string;
          coach_id: string;
          test_type: string;
          test_name: string;
          score: number;
          unit: string;
          test_date: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          athlete_id: string;
          coach_id: string;
          test_type: string;
          test_name: string;
          score: number;
          unit: string;
          test_date: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          athlete_id?: string;
          coach_id?: string;
          test_type?: string;
          test_name?: string;
          score?: number;
          unit?: string;
          test_date?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      announcements: {
        Row: {
          id: string;
          club_id: string | null;
          author_id: string;
          author_role: UserRole;
          title: string;
          content: string;
          priority: AnnouncementPriority;
          published_at: string;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id?: string | null;
          author_id: string;
          author_role: UserRole;
          title: string;
          content: string;
          priority: AnnouncementPriority;
          published_at?: string;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          club_id?: string | null;
          author_id?: string;
          author_role?: UserRole;
          title?: string;
          content?: string;
          priority?: AnnouncementPriority;
          published_at?: string;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      login_sessions: {
        Row: {
          id: string;
          user_id: string;
          device_id: string;
          device_info: Json;
          user_agent: string | null;
          login_at: string;
          logout_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          device_id: string;
          device_info: Json;
          user_agent?: string | null;
          login_at?: string;
          logout_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          device_id?: string;
          device_info?: Json;
          user_agent?: string | null;
          login_at?: string;
          logout_at?: string | null;
          created_at?: string;
        };
      };
      leave_requests: {
        Row: {
          id: string;
          session_id: string;
          athlete_id: string;
          reason: string;
          status: 'pending' | 'approved' | 'rejected';
          requested_at: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          athlete_id: string;
          reason: string;
          status?: 'pending' | 'approved' | 'rejected';
          requested_at?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          athlete_id?: string;
          reason?: string;
          status?: 'pending' | 'approved' | 'rejected';
          requested_at?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
      };
      user_roles: {
        Row: {
          user_id: string;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
      };
      membership_applications: {
        Row: {
          id: string;
          user_id: string;
          club_id: string;
          personal_info: Json;
          documents: Json;
          status: ApplicationStatus;
          review_info: Json | null;
          activity_log: Json;
          profile_id: string | null;
          assigned_coach_id: string | null;
          reviewed_by: string | null;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          club_id: string;
          personal_info: Json;
          documents: Json;
          status?: ApplicationStatus;
          review_info?: Json | null;
          activity_log?: Json;
          profile_id?: string | null;
          assigned_coach_id?: string | null;
          reviewed_by?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          club_id?: string;
          personal_info?: Json;
          documents?: Json;
          status?: ApplicationStatus;
          review_info?: Json | null;
          activity_log?: Json;
          profile_id?: string | null;
          assigned_coach_id?: string | null;
          reviewed_by?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          user_id: string;
          email: string;
          full_name: string;
          role: UserRole;
          membership_status: MembershipStatus | null;
          coach_id: string | null;
          club_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email?: string;
          full_name: string;
          role?: UserRole;
          membership_status?: MembershipStatus | null;
          coach_id?: string | null;
          club_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          email?: string;
          full_name?: string;
          role?: UserRole;
          membership_status?: MembershipStatus | null;
          coach_id?: string | null;
          club_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      progress_snapshots: {
        Row: {
          id: string;
          athlete_id: string;
          snapshot_date: string;
          period_type: PeriodType;
          period_start: string;
          period_end: string;
          total_sessions: number;
          attended_sessions: number;
          attendance_rate: number;
          late_count: number;
          excused_count: number;
          performance_tests_count: number;
          avg_performance_score: number | null;
          best_performance_score: number | null;
          performance_improvement: number | null;
          active_goals_count: number;
          completed_goals_count: number;
          avg_goal_progress: number;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          athlete_id: string;
          snapshot_date?: string;
          period_type?: PeriodType;
          period_start: string;
          period_end: string;
          total_sessions?: number;
          attended_sessions?: number;
          attendance_rate?: number;
          late_count?: number;
          excused_count?: number;
          performance_tests_count?: number;
          avg_performance_score?: number | null;
          best_performance_score?: number | null;
          performance_improvement?: number | null;
          active_goals_count?: number;
          completed_goals_count?: number;
          avg_goal_progress?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          athlete_id?: string;
          snapshot_date?: string;
          period_type?: PeriodType;
          period_start?: string;
          period_end?: string;
          total_sessions?: number;
          attended_sessions?: number;
          attendance_rate?: number;
          late_count?: number;
          excused_count?: number;
          performance_tests_count?: number;
          avg_performance_score?: number | null;
          best_performance_score?: number | null;
          performance_improvement?: number | null;
          active_goals_count?: number;
          completed_goals_count?: number;
          avg_goal_progress?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      progress_reports: {
        Row: {
          id: string;
          athlete_id: string;
          generated_by: string | null;
          report_type: ReportType;
          period_start: string;
          period_end: string;
          title: string;
          summary: string | null;
          highlights: Json;
          areas_for_improvement: Json;
          coach_comments: string | null;
          metrics: Json;
          charts_data: Json;
          status: ReportStatus;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          athlete_id: string;
          generated_by?: string | null;
          report_type?: ReportType;
          period_start: string;
          period_end: string;
          title: string;
          summary?: string | null;
          highlights?: Json;
          areas_for_improvement?: Json;
          coach_comments?: string | null;
          metrics?: Json;
          charts_data?: Json;
          status?: ReportStatus;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          athlete_id?: string;
          generated_by?: string | null;
          report_type?: ReportType;
          period_start?: string;
          period_end?: string;
          title?: string;
          summary?: string | null;
          highlights?: Json;
          areas_for_improvement?: Json;
          coach_comments?: string | null;
          metrics?: Json;
          charts_data?: Json;
          status?: ReportStatus;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      feature_flags: {
        Row: {
          name: string;
          enabled: boolean;
          rollout_percentage: number;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          enabled?: boolean;
          rollout_percentage?: number;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          enabled?: boolean;
          rollout_percentage?: number;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
