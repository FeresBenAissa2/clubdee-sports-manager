/**
 * Property-Based Test for QR Check-in Recording
 * **Feature: feature-integration-plan, Property 10: QR Check-in Recording**
 * 
 * Property 10: QR Check-in Recording
 * *For any* valid QR code scan, the system should record the check-in 
 * and update the athlete's status to "เข้าร่วมแล้ว".
 * 
 * **Validates: Requirements 3.2, 3.5**
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface Activity {
  id: string;
  club_id: string;
  coach_id: string | null;
  title: string;
  activity_date: string;
  start_time: string | null;
  end_time: string | null;
  qr_code_token: string | null;
  status: string | null;
}

interface Athlete {
  id: string;
  user_id: string;
  club_id: string;
}

interface ActivityCheckIn {
  id: string;
  activity_id: string;
  athlete_id: string;
  status: string;
  checked_in_at: string;
  checkin_method: string | null;
}

describe('Property 10: QR Check-in Recording', () => {
  let supabase: SupabaseClient;
  let allActivities: Activity[] = [];
  let allAthletes: Athlete[] = [];
  let allCheckIns: ActivityCheckIn[] = [];

  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all activities
    const { data: activities } = await supabase
      .from('activities')
      .select('id, club_id, coach_id, title, activity_date, start_time, end_time, qr_code_token, status');
    allActivities = activities || [];

    // Fetch all athletes
    const { data: athletes } = await supabase
      .from('athletes')
      .select('id, user_id, club_id');
    allAthletes = athletes || [];

    // Fetch all activity check-ins
    const { data: checkIns } = await supabase
      .from('activity_checkins')
      .select('id, activity_id, athlete_id, status, checked_in_at, checkin_method');
    allCheckIns = checkIns || [];

    console.log('Test setup:', {
      activityCount: allActivities.length,
      athleteCount: allAthletes.length,
      checkInCount: allCheckIns.length,
    });
  });

  /**
   * **Feature: feature-integration-plan, Property 10: QR Check-in Recording**
   * 
   * For any existing check-in record, verify it has all required fields
   * and the status reflects a successful check-in.
   */
  it('check-in records have all required fields', async () => {
    if (allCheckIns.length === 0) {
      console.log('Skipping: No check-in records available');
      return;
    }

    const checkInArb = fc.constantFrom(...allCheckIns.slice(0, 100));

    await fc.assert(
      fc.asyncProperty(checkInArb, async (checkIn) => {
        // Property: Check-in must have an activity_id
        expect(checkIn.activity_id).toBeDefined();
        expect(checkIn.activity_id).not.toBeNull();

        // Property: Check-in must have an athlete_id
        expect(checkIn.athlete_id).toBeDefined();
        expect(checkIn.athlete_id).not.toBeNull();

        // Property: Check-in must have a status
        expect(checkIn.status).toBeDefined();
        expect(['on_time', 'late', 'present']).toContain(checkIn.status);

        // Property: Check-in must have a timestamp
        expect(checkIn.checked_in_at).toBeDefined();
        expect(checkIn.checked_in_at).not.toBeNull();
      }),
      { numRuns: Math.min(100, allCheckIns.length) }
    );
  }, 60000);

  /**
   * **Feature: feature-integration-plan, Property 10: QR Check-in Recording**
   * 
   * For any check-in with QR method, verify the check-in method is recorded correctly.
   */
  it('QR check-ins have correct method recorded', async () => {
    // Filter check-ins with QR method
    const qrCheckIns = allCheckIns.filter(c => c.checkin_method === 'qr');

    if (qrCheckIns.length === 0) {
      console.log('Skipping: No QR check-in records available');
      return;
    }

    const checkInArb = fc.constantFrom(...qrCheckIns.slice(0, 50));

    await fc.assert(
      fc.asyncProperty(checkInArb, async (checkIn) => {
        // Verify the check-in record in database
        const { data: record, error } = await supabase
          .from('activity_checkins')
          .select('id, checkin_method, status, checked_in_at')
          .eq('id', checkIn.id)
          .single();

        expect(error).toBeNull();
        expect(record).not.toBeNull();

        // Property: Check-in method should be 'qr'
        expect(record?.checkin_method).toBe('qr');

        // Property: Status should indicate successful check-in
        expect(['on_time', 'late', 'present']).toContain(record?.status);
      }),
      { numRuns: Math.min(50, qrCheckIns.length) }
    );
  }, 60000);

  /**
   * **Feature: feature-integration-plan, Property 10: QR Check-in Recording**
   * 
   * For any activity-athlete pair with a check-in, the athlete's status
   * should be "checked in" (เข้าร่วมแล้ว).
   */
  it('checked-in athletes have correct status', async () => {
    if (allCheckIns.length === 0) {
      console.log('Skipping: No check-in records available');
      return;
    }

    const checkInArb = fc.constantFrom(...allCheckIns.slice(0, 50));

    await fc.assert(
      fc.asyncProperty(checkInArb, async (checkIn) => {
        // Query the check-in status for this activity-athlete pair
        const { data: status, error } = await supabase
          .from('activity_checkins')
          .select('id, status, checked_in_at')
          .eq('activity_id', checkIn.activity_id)
          .eq('athlete_id', checkIn.athlete_id)
          .single();

        expect(error).toBeNull();
        expect(status).not.toBeNull();

        // Property: A check-in record exists (athlete has checked in)
        expect(status?.id).toBeDefined();

        // Property: Status indicates successful check-in
        expect(['on_time', 'late', 'present']).toContain(status?.status);

        // Property: Check-in time is recorded
        expect(status?.checked_in_at).not.toBeNull();
      }),
      { numRuns: Math.min(50, allCheckIns.length) }
    );
  }, 60000);

  /**
   * **Feature: feature-integration-plan, Property 10: QR Check-in Recording**
   * 
   * For any check-in, the associated activity and athlete must exist
   * and belong to the same club.
   */
  it('check-ins reference valid activity and athlete in same club', async () => {
    if (allCheckIns.length === 0) {
      console.log('Skipping: No check-in records available');
      return;
    }

    const checkInArb = fc.constantFrom(...allCheckIns.slice(0, 50));

    await fc.assert(
      fc.asyncProperty(checkInArb, async (checkIn) => {
        // Get the activity
        const activity = allActivities.find(a => a.id === checkIn.activity_id);
        
        // Get the athlete
        const athlete = allAthletes.find(a => a.id === checkIn.athlete_id);

        // Property: Activity must exist
        expect(activity).toBeDefined();

        // Property: Athlete must exist
        expect(athlete).toBeDefined();

        // Property: Activity and athlete must be in the same club
        if (activity && athlete) {
          expect(activity.club_id).toBe(athlete.club_id);
        }
      }),
      { numRuns: Math.min(50, allCheckIns.length) }
    );
  }, 60000);

  /**
   * **Feature: feature-integration-plan, Property 10: QR Check-in Recording**
   * 
   * For any activity, there should be no duplicate check-ins for the same athlete.
   */
  it('no duplicate check-ins for same athlete-activity pair', async () => {
    if (allActivities.length === 0) {
      console.log('Skipping: No activities available');
      return;
    }

    // Get activities that have check-ins
    const activitiesWithCheckIns = allActivities.filter(activity =>
      allCheckIns.some(c => c.activity_id === activity.id)
    );

    if (activitiesWithCheckIns.length === 0) {
      console.log('Skipping: No activities with check-ins');
      return;
    }

    const activityArb = fc.constantFrom(...activitiesWithCheckIns.slice(0, 30));

    await fc.assert(
      fc.asyncProperty(activityArb, async (activity) => {
        // Get all check-ins for this activity
        const { data: activityCheckIns, error } = await supabase
          .from('activity_checkins')
          .select('id, athlete_id')
          .eq('activity_id', activity.id);

        expect(error).toBeNull();

        if (activityCheckIns && activityCheckIns.length > 0) {
          // Get unique athlete IDs
          const athleteIds = activityCheckIns.map(c => c.athlete_id);
          const uniqueAthleteIds = [...new Set(athleteIds)];

          // Property: No duplicate check-ins (each athlete appears only once)
          expect(athleteIds.length).toBe(uniqueAthleteIds.length);
        }
      }),
      { numRuns: Math.min(30, activitiesWithCheckIns.length) }
    );
  }, 60000);

  /**
   * **Feature: feature-integration-plan, Property 10: QR Check-in Recording**
   * 
   * Simulates the QR check-in recording logic to verify correctness.
   */
  it('simulated QR check-in records correctly', () => {
    // Simulate the check-in data structure
    interface SimulatedActivity {
      id: string;
      clubId: string;
      qrToken: string;
      startTime: Date;
    }

    interface SimulatedAthlete {
      id: string;
      clubId: string;
    }

    interface CheckInRecord {
      activityId: string;
      athleteId: string;
      status: 'on_time' | 'late';
      checkedInAt: string;
      checkinMethod: 'qr';
    }

    interface CheckInStore {
      records: Map<string, CheckInRecord>;
    }

    // Function to generate check-in key
    function getCheckInKey(activityId: string, athleteId: string): string {
      return `${activityId}:${athleteId}`;
    }

    // Function to simulate QR check-in
    function processQRCheckIn(
      store: CheckInStore,
      activity: SimulatedActivity,
      athlete: SimulatedAthlete,
      qrToken: string,
      checkInTime: Date
    ): { success: boolean; message: string; record?: CheckInRecord } {
      // Validate QR token
      if (activity.qrToken !== qrToken) {
        return { success: false, message: 'QR Code ไม่ถูกต้อง' };
      }

      // Validate same club
      if (activity.clubId !== athlete.clubId) {
        return { success: false, message: 'นักกีฬาไม่ได้อยู่ในสโมสรเดียวกับกิจกรรม' };
      }

      // Check for duplicate
      const key = getCheckInKey(activity.id, athlete.id);
      if (store.records.has(key)) {
        return { success: false, message: 'คุณได้เช็คอินแล้ว' };
      }

      // Determine status (on_time or late)
      const isLate = checkInTime > activity.startTime;
      const status: 'on_time' | 'late' = isLate ? 'late' : 'on_time';

      // Create check-in record
      const record: CheckInRecord = {
        activityId: activity.id,
        athleteId: athlete.id,
        status,
        checkedInAt: checkInTime.toISOString(),
        checkinMethod: 'qr',
      };

      store.records.set(key, record);

      return {
        success: true,
        message: isLate ? 'เช็คอินสำเร็จ (มาสาย)' : 'เช็คอินสำเร็จ',
        record,
      };
    }

    // Function to get check-in status
    function getCheckInStatus(
      store: CheckInStore,
      activityId: string,
      athleteId: string
    ): { isCheckedIn: boolean; checkInTime: string | null } {
      const key = getCheckInKey(activityId, athleteId);
      const record = store.records.get(key);
      
      if (!record) {
        return { isCheckedIn: false, checkInTime: null };
      }

      return { isCheckedIn: true, checkInTime: record.checkedInAt };
    }

    // Arbitraries for simulation
    const clubIdArb = fc.uuid();
    const activityIdArb = fc.uuid();
    const athleteIdArb = fc.uuid();
    // Use string with filter to ensure non-whitespace tokens
    const qrTokenArb = fc.string({ minLength: 32, maxLength: 32 }).filter(s => s.trim().length >= 16);
    // Use integer timestamps to avoid invalid dates
    const startTimeArb = fc.integer({ min: new Date('2024-01-01').getTime(), max: new Date('2025-12-31').getTime() }).map(ts => new Date(ts));

    const activityArb = fc.record({
      id: activityIdArb,
      clubId: clubIdArb,
      qrToken: qrTokenArb,
      startTime: startTimeArb,
    });

    fc.assert(
      fc.property(activityArb, athleteIdArb, (activity, athleteId) => {
        const store: CheckInStore = { records: new Map() };
        
        // Create athlete in same club
        const athlete: SimulatedAthlete = {
          id: athleteId,
          clubId: activity.clubId,
        };

        // Check-in time is after start time (late scenario)
        const checkInTime = new Date(activity.startTime.getTime() + 60000); // 1 minute after

        // Process QR check-in with correct token
        const result = processQRCheckIn(
          store,
          activity,
          athlete,
          activity.qrToken,
          checkInTime
        );

        // Property: Check-in should succeed with correct token and same club
        expect(result.success).toBe(true);
        expect(result.record).toBeDefined();

        // Property: Check-in record should have correct data
        expect(result.record?.activityId).toBe(activity.id);
        expect(result.record?.athleteId).toBe(athlete.id);
        expect(result.record?.checkinMethod).toBe('qr');

        // Property: Status should be 'late' since check-in is after start time
        expect(result.record?.status).toBe('late');

        // Property: getCheckInStatus should return checked-in status
        const status = getCheckInStatus(store, activity.id, athlete.id);
        expect(status.isCheckedIn).toBe(true);
        expect(status.checkInTime).toBe(result.record?.checkedInAt);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: feature-integration-plan, Property 10: QR Check-in Recording**
   * 
   * Simulates that invalid QR tokens are rejected.
   */
  it('invalid QR tokens are rejected', () => {
    interface SimulatedActivity {
      id: string;
      clubId: string;
      qrToken: string;
      startTime: Date;
    }

    interface SimulatedAthlete {
      id: string;
      clubId: string;
    }

    interface CheckInRecord {
      activityId: string;
      athleteId: string;
      status: 'on_time' | 'late';
      checkedInAt: string;
      checkinMethod: 'qr';
    }

    interface CheckInStore {
      records: Map<string, CheckInRecord>;
    }

    function processQRCheckIn(
      store: CheckInStore,
      activity: SimulatedActivity,
      athlete: SimulatedAthlete,
      qrToken: string,
      checkInTime: Date
    ): { success: boolean; message: string } {
      if (activity.qrToken !== qrToken) {
        return { success: false, message: 'QR Code ไม่ถูกต้อง' };
      }
      if (activity.clubId !== athlete.clubId) {
        return { success: false, message: 'นักกีฬาไม่ได้อยู่ในสโมสรเดียวกับกิจกรรม' };
      }
      return { success: true, message: 'เช็คอินสำเร็จ' };
    }

    const clubIdArb = fc.uuid();
    const activityIdArb = fc.uuid();
    const athleteIdArb = fc.uuid();
    const qrTokenArb = fc.string({ minLength: 32, maxLength: 32 });
    const wrongTokenArb = fc.string({ minLength: 32, maxLength: 32 });
    const startTimeArb = fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') });

    fc.assert(
      fc.property(
        activityIdArb,
        clubIdArb,
        athleteIdArb,
        qrTokenArb,
        wrongTokenArb,
        startTimeArb,
        (activityId, clubId, athleteId, correctToken, wrongToken) => {
          // Skip if tokens happen to be the same
          fc.pre(correctToken !== wrongToken);

          const store: CheckInStore = { records: new Map() };
          
          const activity: SimulatedActivity = {
            id: activityId,
            clubId,
            qrToken: correctToken,
            startTime: new Date(),
          };

          const athlete: SimulatedAthlete = {
            id: athleteId,
            clubId,
          };

          // Try to check in with wrong token
          const result = processQRCheckIn(
            store,
            activity,
            athlete,
            wrongToken,
            new Date()
          );

          // Property: Check-in should fail with wrong token
          expect(result.success).toBe(false);
          expect(result.message).toBe('QR Code ไม่ถูกต้อง');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: feature-integration-plan, Property 10: QR Check-in Recording**
   * 
   * Simulates that athletes from different clubs cannot check in.
   */
  it('athletes from different clubs cannot check in', () => {
    interface SimulatedActivity {
      id: string;
      clubId: string;
      qrToken: string;
    }

    interface SimulatedAthlete {
      id: string;
      clubId: string;
    }

    interface CheckInStore {
      records: Map<string, unknown>;
    }

    function processQRCheckIn(
      activity: SimulatedActivity,
      athlete: SimulatedAthlete,
      qrToken: string
    ): { success: boolean; message: string } {
      if (activity.qrToken !== qrToken) {
        return { success: false, message: 'QR Code ไม่ถูกต้อง' };
      }
      if (activity.clubId !== athlete.clubId) {
        return { success: false, message: 'นักกีฬาไม่ได้อยู่ในสโมสรเดียวกับกิจกรรม' };
      }
      return { success: true, message: 'เช็คอินสำเร็จ' };
    }

    const activityIdArb = fc.uuid();
    const athleteIdArb = fc.uuid();
    const clubId1Arb = fc.uuid();
    const clubId2Arb = fc.uuid();
    const qrTokenArb = fc.string({ minLength: 32, maxLength: 32 });

    fc.assert(
      fc.property(
        activityIdArb,
        athleteIdArb,
        clubId1Arb,
        clubId2Arb,
        qrTokenArb,
        (activityId, athleteId, clubId1, clubId2) => {
          // Skip if club IDs happen to be the same
          fc.pre(clubId1 !== clubId2);

          const activity: SimulatedActivity = {
            id: activityId,
            clubId: clubId1,
            qrToken: 'valid-token',
          };

          const athlete: SimulatedAthlete = {
            id: athleteId,
            clubId: clubId2, // Different club
          };

          // Try to check in
          const result = processQRCheckIn(activity, athlete, 'valid-token');

          // Property: Check-in should fail for different club
          expect(result.success).toBe(false);
          expect(result.message).toBe('นักกีฬาไม่ได้อยู่ในสโมสรเดียวกับกิจกรรม');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: feature-integration-plan, Property 10: QR Check-in Recording**
   * 
   * Simulates that duplicate check-ins are prevented.
   */
  it('duplicate check-ins are prevented', () => {
    interface CheckInRecord {
      activityId: string;
      athleteId: string;
      checkedInAt: string;
    }

    interface CheckInStore {
      records: Map<string, CheckInRecord>;
    }

    function getCheckInKey(activityId: string, athleteId: string): string {
      return `${activityId}:${athleteId}`;
    }

    function processCheckIn(
      store: CheckInStore,
      activityId: string,
      athleteId: string
    ): { success: boolean; message: string } {
      const key = getCheckInKey(activityId, athleteId);
      
      if (store.records.has(key)) {
        return { success: false, message: 'คุณได้เช็คอินแล้ว' };
      }

      store.records.set(key, {
        activityId,
        athleteId,
        checkedInAt: new Date().toISOString(),
      });

      return { success: true, message: 'เช็คอินสำเร็จ' };
    }

    const activityIdArb = fc.uuid();
    const athleteIdArb = fc.uuid();

    fc.assert(
      fc.property(activityIdArb, athleteIdArb, (activityId, athleteId) => {
        const store: CheckInStore = { records: new Map() };

        // First check-in should succeed
        const firstResult = processCheckIn(store, activityId, athleteId);
        expect(firstResult.success).toBe(true);

        // Second check-in should fail
        const secondResult = processCheckIn(store, activityId, athleteId);
        expect(secondResult.success).toBe(false);
        expect(secondResult.message).toBe('คุณได้เช็คอินแล้ว');

        // Property: Only one record should exist
        expect(store.records.size).toBe(1);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: feature-integration-plan, Property 10: QR Check-in Recording**
   * 
   * Simulates on-time vs late status determination.
   */
  it('check-in status correctly reflects timing', () => {
    function determineStatus(
      activityStartTime: Date,
      checkInTime: Date
    ): 'on_time' | 'late' {
      return checkInTime > activityStartTime ? 'late' : 'on_time';
    }

    const baseTimeArb = fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') });
    const offsetArb = fc.integer({ min: -3600000, max: 3600000 }); // -1 hour to +1 hour in ms

    fc.assert(
      fc.property(baseTimeArb, offsetArb, (baseTime, offset) => {
        const activityStartTime = baseTime;
        const checkInTime = new Date(baseTime.getTime() + offset);

        const status = determineStatus(activityStartTime, checkInTime);

        if (offset > 0) {
          // Check-in after start time
          expect(status).toBe('late');
        } else {
          // Check-in at or before start time
          expect(status).toBe('on_time');
        }
      }),
      { numRuns: 100 }
    );
  });
});
