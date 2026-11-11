'use server';

import { createClient } from '@/lib/db/server';
import { revalidatePath } from 'next/cache';

export interface CreateGoalInput {
  athleteId: string;
  title: string;
  description?: string;
  category: 'performance' | 'attendance' | 'skill' | 'fitness' | 'other';
  targetValue?: number;
  targetUnit?: string;
  priority?: 'low' | 'medium' | 'high';
  targetDate: string;
}

export interface UpdateGoalInput extends Partial<CreateGoalInput> {
  id: string;
  currentValue?: number;
  progressPercentage?: number;
  status?: 'active' | 'completed' | 'cancelled' | 'overdue';
}

/**
 * Create a new goal for an athlete
 */
export async function createGoal(input: CreateGoalInput) {
  const db = await createClient();

  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Get coach profile
  const { data: coach } = await (db as any)
    .from('coaches')
    .select('id, club_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!coach) {
    return { success: false, error: 'Coach profile not found' };
  }

  // Verify athlete belongs to coach's club
  const { data: athlete } = await (db as any)
    .from('athletes')
    .select('id, club_id')
    .eq('id', input.athleteId)
    .maybeSingle();

  if (!athlete || athlete.club_id !== coach.club_id) {
    return { success: false, error: 'Athlete not found in your club' };
  }

  // Create goal
  const { data, error } = await (db as any)
    .from('athlete_goals')
    .insert({
      athlete_id: input.athleteId,
      coach_id: coach.id,
      title: input.title,
      description: input.description || null,
      category: input.category,
      target_value: input.targetValue || null,
      target_unit: input.targetUnit || null,
      priority: input.priority || 'medium',
      target_date: input.targetDate,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating goal:', error);
    return { success: false, error: 'Failed to create goal' };
  }

  revalidatePath('/dashboard/coach/athletes');
  revalidatePath('/dashboard/athlete');

  return { success: true, data };
}

/**
 * Update an existing goal
 */
export async function updateGoal(input: UpdateGoalInput) {
  const db = await createClient();

  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Get coach profile
  const { data: coach } = await (db as any)
    .from('coaches')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!coach) {
    return { success: false, error: 'Coach profile not found' };
  }

  const updateData: any = {};
  if (input.title) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.category) updateData.category = input.category;
  if (input.targetValue !== undefined) updateData.target_value = input.targetValue;
  if (input.targetUnit !== undefined) updateData.target_unit = input.targetUnit;
  if (input.currentValue !== undefined) updateData.current_value = input.currentValue;
  if (input.progressPercentage !== undefined)
    updateData.progress_percentage = input.progressPercentage;
  if (input.priority) updateData.priority = input.priority;
  if (input.targetDate) updateData.target_date = input.targetDate;
  if (input.status) updateData.status = input.status;

  const { data, error } = await (db as any)
    .from('athlete_goals')
    .update(updateData)
    .eq('id', input.id)
    .eq('coach_id', coach.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating goal:', error);
    return { success: false, error: 'Failed to update goal' };
  }

  revalidatePath('/dashboard/coach/athletes');
  revalidatePath('/dashboard/athlete');

  return { success: true, data };
}

/**
 * Delete a goal
 */
export async function deleteGoal(goalId: string) {
  const db = await createClient();

  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Get coach profile
  const { data: coach } = await (db as any)
    .from('coaches')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!coach) {
    return { success: false, error: 'Coach profile not found' };
  }

  const { error } = await (db as any)
    .from('athlete_goals')
    .delete()
    .eq('id', goalId)
    .eq('coach_id', coach.id);

  if (error) {
    console.error('Error deleting goal:', error);
    return { success: false, error: 'Failed to delete goal' };
  }

  revalidatePath('/dashboard/coach/athletes');
  revalidatePath('/dashboard/athlete');

  return { success: true };
}

/**
 * Get goals for an athlete
 */
export async function getAthleteGoals(athleteId: string) {
  const db = await createClient();

  const { data, error } = await (db as any)
    .from('athlete_goals')
    .select(
      `
      *,
      coaches (
        first_name,
        last_name
      )
    `
    )
    .eq('athlete_id', athleteId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching goals:', error);
    return { success: false, error: 'Failed to fetch goals', data: [] };
  }

  return { success: true, data: data || [] };
}

/**
 * Get all goals for coach's athletes
 */
export async function getCoachGoals() {
  const db = await createClient();

  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized', data: [] };
  }

  // Get coach profile
  const { data: coach } = await (db as any)
    .from('coaches')
    .select('id, club_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!coach) {
    return { success: false, error: 'Coach profile not found', data: [] };
  }

  const { data, error } = await (db as any)
    .from('athlete_goals')
    .select(
      `
      *,
      athletes (
        id,
        first_name,
        last_name,
        nickname
      )
    `
    )
    .eq('coach_id', coach.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching coach goals:', error);
    return { success: false, error: 'Failed to fetch goals', data: [] };
  }

  return { success: true, data: data || [] };
}
