/**
 * Property-Based Test for Urgent Announcement Indicator
 * **Feature: feature-integration-plan, Property 3: Urgent Announcement Indicator**
 * 
 * Property 3: Urgent Announcement Indicator
 * *For any* urgent announcement, the athlete dashboard should display a visual indicator 
 * distinguishing it from normal announcements.
 * 
 * **Validates: Requirements 1.3**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  UrgentIndicator,
  AnnouncementPriorityBadge,
  getAnnouncementCardStyle,
  getAnnouncementIconStyle,
} from '../components/athlete/UnreadAnnouncementBadge';
import {
  isUrgentAnnouncement,
  getPriorityBadge,
  getAnnouncementStyle,
} from '../lib/integration/announcement-integration';

// Define the priority type for testing
type AnnouncementPriority = 'low' | 'normal' | 'high' | 'urgent';

// Arbitraries for property-based testing
const priorityArb = fc.constantFrom<AnnouncementPriority>('low', 'normal', 'high', 'urgent');
const urgentPriorityArb = fc.constantFrom<AnnouncementPriority>('high', 'urgent');
const nonUrgentPriorityArb = fc.constantFrom<AnnouncementPriority>('low', 'normal');
const booleanArb = fc.boolean();

describe('Property 3: Urgent Announcement Indicator', () => {
  /**
   * **Feature: feature-integration-plan, Property 3: Urgent Announcement Indicator**
   * 
   * For any announcement with 'urgent' or 'high' priority, the isUrgentAnnouncement
   * function should return true.
   */
  it('isUrgentAnnouncement returns true for urgent and high priority', async () => {
    await fc.assert(
      fc.property(urgentPriorityArb, (priority) => {
        // Property: Urgent and high priority announcements should be identified as urgent
        const result = isUrgentAnnouncement(priority);
        expect(result).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: feature-integration-plan, Property 3: Urgent Announcement Indicator**
   * 
   * For any announcement with 'low' or 'normal' priority, the isUrgentAnnouncement
   * function should return false.
   */
  it('isUrgentAnnouncement returns false for low and normal priority', async () => {
    await fc.assert(
      fc.property(nonUrgentPriorityArb, (priority) => {
        // Property: Low and normal priority announcements should not be identified as urgent
        const result = isUrgentAnnouncement(priority);
        expect(result).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: feature-integration-plan, Property 3: Urgent Announcement Indicator**
   * 
   * For any priority, the classification should be consistent and deterministic.
   */
  it('urgent classification is deterministic for all priorities', async () => {
    await fc.assert(
      fc.property(priorityArb, (priority) => {
        // Property: Same priority should always produce the same result
        const result1 = isUrgentAnnouncement(priority);
        const result2 = isUrgentAnnouncement(priority);
        expect(result1).toBe(result2);

        // Property: Result should be a boolean
        expect(typeof result1).toBe('boolean');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: feature-integration-plan, Property 3: Urgent Announcement Indicator**
   * 
   * For any urgent announcement, getPriorityBadge should return a non-null badge config.
   */
  it('getPriorityBadge returns badge config for urgent priorities', async () => {
    await fc.assert(
      fc.property(urgentPriorityArb, (priority) => {
        // Property: Urgent priorities should have a badge configuration
        const badge = getPriorityBadge(priority);
        expect(badge).not.toBeNull();
        expect(badge?.label).toBeDefined();
        expect(badge?.className).toBeDefined();
        expect(badge?.label.length).toBeGreaterThan(0);
        expect(badge?.className.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: feature-integration-plan, Property 3: Urgent Announcement Indicator**
   * 
   * For any non-urgent announcement, getPriorityBadge should return null.
   */
  it('getPriorityBadge returns null for non-urgent priorities', async () => {
    await fc.assert(
      fc.property(nonUrgentPriorityArb, (priority) => {
        // Property: Non-urgent priorities should not have a badge
        const badge = getPriorityBadge(priority);
        expect(badge).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: feature-integration-plan, Property 3: Urgent Announcement Indicator**
   * 
   * For any urgent announcement, getAnnouncementStyle should return a distinct style
   * that differs from normal announcements.
   */
  it('urgent announcements have distinct visual styles', async () => {
    await fc.assert(
      fc.property(urgentPriorityArb, booleanArb, (priority, isRead) => {
        // Property: Urgent announcements should have colored backgrounds
        const style = getAnnouncementStyle(priority, isRead);
        
        // Urgent should have red styling, high should have orange styling
        if (priority === 'urgent') {
          expect(style).toContain('red');
        } else if (priority === 'high') {
          expect(style).toContain('orange');
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: feature-integration-plan, Property 3: Urgent Announcement Indicator**
   * 
   * For any non-urgent announcement, the style should be based on read status only.
   */
  it('non-urgent announcements style depends on read status', async () => {
    await fc.assert(
      fc.property(nonUrgentPriorityArb, booleanArb, (priority, isRead) => {
        // Property: Non-urgent announcements should have neutral styling
        const style = getAnnouncementStyle(priority, isRead);
        
        // Should not contain urgent colors
        expect(style).not.toContain('red');
        expect(style).not.toContain('orange');
        
        // Style should differ based on read status
        if (isRead) {
          expect(style).toContain('gray');
        } else {
          expect(style).toContain('black');
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: feature-integration-plan, Property 3: Urgent Announcement Indicator**
   * 
   * For any urgent announcement, getAnnouncementCardStyle should return a distinct style.
   */
  it('getAnnouncementCardStyle returns distinct styles for urgent priorities', async () => {
    await fc.assert(
      fc.property(urgentPriorityArb, booleanArb, (priority, isRead) => {
        // Property: Urgent card styles should have colored backgrounds
        const style = getAnnouncementCardStyle(priority, isRead);
        
        if (priority === 'urgent') {
          expect(style).toContain('red');
        } else if (priority === 'high') {
          expect(style).toContain('orange');
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: feature-integration-plan, Property 3: Urgent Announcement Indicator**
   * 
   * For any urgent announcement, getAnnouncementIconStyle should return a colored icon style.
   */
  it('getAnnouncementIconStyle returns colored styles for urgent priorities', async () => {
    await fc.assert(
      fc.property(urgentPriorityArb, (priority) => {
        // Property: Urgent icon styles should have colored backgrounds
        const style = getAnnouncementIconStyle(priority);
        
        if (priority === 'urgent') {
          expect(style).toContain('red');
        } else if (priority === 'high') {
          expect(style).toContain('orange');
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: feature-integration-plan, Property 3: Urgent Announcement Indicator**
   * 
   * For any non-urgent announcement, getAnnouncementIconStyle should return a neutral style.
   */
  it('getAnnouncementIconStyle returns neutral styles for non-urgent priorities', async () => {
    await fc.assert(
      fc.property(nonUrgentPriorityArb, (priority) => {
        // Property: Non-urgent icon styles should be neutral (black)
        const style = getAnnouncementIconStyle(priority);
        
        expect(style).toContain('black');
        expect(style).not.toContain('red');
        expect(style).not.toContain('orange');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: feature-integration-plan, Property 3: Urgent Announcement Indicator**
   * 
   * For any priority, urgent and high should be visually distinguishable from each other.
   */
  it('urgent and high priorities have different visual indicators', async () => {
    // Property: Urgent and high should have different badge labels
    const urgentBadge = getPriorityBadge('urgent');
    const highBadge = getPriorityBadge('high');
    
    expect(urgentBadge).not.toBeNull();
    expect(highBadge).not.toBeNull();
    expect(urgentBadge?.label).not.toBe(highBadge?.label);
    
    // Property: Urgent and high should have different card styles
    const urgentStyle = getAnnouncementCardStyle('urgent', false);
    const highStyle = getAnnouncementCardStyle('high', false);
    
    expect(urgentStyle).not.toBe(highStyle);
    
    // Property: Urgent and high should have different icon styles
    const urgentIconStyle = getAnnouncementIconStyle('urgent');
    const highIconStyle = getAnnouncementIconStyle('high');
    
    expect(urgentIconStyle).not.toBe(highIconStyle);
  });

  /**
   * **Feature: feature-integration-plan, Property 3: Urgent Announcement Indicator**
   * 
   * For any priority, the visual hierarchy should be: urgent > high > normal > low
   */
  it('visual hierarchy is maintained across all priorities', async () => {
    // Property: Only urgent and high should have badges
    const urgentBadge = getPriorityBadge('urgent');
    const highBadge = getPriorityBadge('high');
    const normalBadge = getPriorityBadge('normal');
    const lowBadge = getPriorityBadge('low');
    
    expect(urgentBadge).not.toBeNull();
    expect(highBadge).not.toBeNull();
    expect(normalBadge).toBeNull();
    expect(lowBadge).toBeNull();
    
    // Property: Urgent should be identified as urgent
    expect(isUrgentAnnouncement('urgent')).toBe(true);
    expect(isUrgentAnnouncement('high')).toBe(true);
    expect(isUrgentAnnouncement('normal')).toBe(false);
    expect(isUrgentAnnouncement('low')).toBe(false);
  });

  /**
   * **Feature: feature-integration-plan, Property 3: Urgent Announcement Indicator**
   * 
   * For any combination of priority and read status, the styling functions should
   * return valid CSS class strings.
   */
  it('styling functions return valid CSS class strings', async () => {
    await fc.assert(
      fc.property(priorityArb, booleanArb, (priority, isRead) => {
        // Property: getAnnouncementStyle should return a non-empty string
        const style = getAnnouncementStyle(priority, isRead);
        expect(typeof style).toBe('string');
        expect(style.length).toBeGreaterThan(0);
        
        // Property: getAnnouncementCardStyle should return a non-empty string
        const cardStyle = getAnnouncementCardStyle(priority, isRead);
        expect(typeof cardStyle).toBe('string');
        expect(cardStyle.length).toBeGreaterThan(0);
        
        // Property: getAnnouncementIconStyle should return a non-empty string
        const iconStyle = getAnnouncementIconStyle(priority);
        expect(typeof iconStyle).toBe('string');
        expect(iconStyle.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });
});
