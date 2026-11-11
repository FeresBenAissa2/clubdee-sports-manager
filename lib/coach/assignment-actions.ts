'use server';

import { createClient } from '@/lib/db/server';
import { revalidatePath } from 'next/cache';

export interface CreateAssignmentInput {
  athleteId: string;
  title: string;
  description?: string;
  instructions?: string;
  category: 'general' | 'strength' | 'cardio' | 'skill' | 'flexibility' | 'recovery' | 'technique';
  targetValue?: number;
  targetUnit?: string;
  dueDate: string;
  frequency?: 'once' | 'daily' | 'weekly' | 'monthly';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export async function createAssignment(input: CreateAssignmentInput) {
  const db = await createClient();

  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not signed in' };
  }

  // Get coach info
  const { data: coachData } = await db
    .from('coaches')
    .select('id, club_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  const coach = coachData as { id: string; club_id: string } | null;

  if (!coach) {
    return { success: false, error: 'Coach profile not found' };
  }

  // Verify athlete is in same club
  const { data: athleteData } = await db
    .from('athletes')
    .select('id, club_id')
    .eq('id', input.athleteId)
    .eq('club_id', coach.club_id)
    .single();

  const athlete = athleteData as { id: string; club_id: string } | null;

  if (!athlete) {
    return { success: false, error: 'No athletes found in this club' };
  }

  const insertData = {
    athlete_id: input.athleteId,
    coach_id: coach.id,
    club_id: coach.club_id,
    title: input.title,
    description: input.description,
    instructions: input.instructions,
    category: input.category,
    target_value: input.targetValue,
    target_unit: input.targetUnit,
    due_date: input.dueDate,
    frequency: input.frequency || 'once',
    priority: input.priority || 'medium',
  };

  const { data, error } = await db
    .from('training_assignments')
    .insert(insertData as never)
    .select()
    .single();

  if (error) {
    console.error('Error creating assignment:', error);
    return { success: false, error: 'Could not create assignment' };
  }

  revalidatePath('/dashboard/coach/athletes');
  revalidatePath(`/dashboard/coach/athletes/${input.athleteId}`);
  revalidatePath('/dashboard/athlete');
  revalidatePath('/dashboard/athlete/assignments');

  return { success: true, data };
}

export async function getAthleteAssignments(athleteId: string) {
  const db = await createClient();

  const { data, error } = await db
    .from('training_assignments')
    .select(`
      *,
      coaches (
        first_name,
        last_name
      )
    `)
    .eq('athlete_id', athleteId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching assignments:', error);
    return [];
  }

  return data;
}

export async function updateAssignmentProgress(
  assignmentId: string,
  progress: number,
  notes?: string
) {
  const db = await createClient();

  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not signed in' };
  }

  const updateData: Record<string, unknown> = {
    progress_percentage: Math.min(100, Math.max(0, progress)),
    status: progress > 0 ? 'in_progress' : 'pending',
  };

  if (notes !== undefined) {
    updateData.athlete_notes = notes;
  }

  if (progress >= 100) {
    updateData.status = 'submitted';
    updateData.athlete_submitted_at = new Date().toISOString();
  }

  const { error } = await db
    .from('training_assignments')
    .update(updateData as never)
    .eq('id', assignmentId);

  if (error) {
    console.error('Error updating assignment:', error);
    return { success: false, error: 'Could not update assignment' };
  }

  revalidatePath('/dashboard/athlete');
  revalidatePath('/dashboard/athlete/assignments');

  return { success: true };
}

export async function completeAssignment(assignmentId: string, feedback?: string) {
  const db = await createClient();

  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not signed in' };
  }

  const updateData: Record<string, unknown> = {
    status: 'completed',
    progress_percentage: 100,
    coach_reviewed_at: new Date().toISOString(),
  };

  if (feedback) {
    updateData.coach_feedback = feedback;
  }

  const { error } = await db
    .from('training_assignments')
    .update(updateData as never)
    .eq('id', assignmentId);

  if (error) {
    console.error('Error completing assignment:', error);
    return { success: false, error: 'Could not update assignment' };
  }

  revalidatePath('/dashboard/coach/athletes');
  revalidatePath('/dashboard/athlete');
  revalidatePath('/dashboard/athlete/assignments');

  return { success: true };
}

export async function deleteAssignment(assignmentId: string) {
  const db = await createClient();

  const { error } = await db
    .from('training_assignments')
    .delete()
    .eq('id', assignmentId);

  if (error) {
    console.error('Error deleting assignment:', error);
    return { success: false, error: 'Could not delete assignment' };
  }

  revalidatePath('/dashboard/coach/athletes');
  revalidatePath('/dashboard/athlete/assignments');

  return { success: true };
}
