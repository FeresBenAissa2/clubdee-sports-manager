'use server';

import { createClient } from '@/lib/db/server';
import { revalidatePath } from 'next/cache';
import { createAuditLog } from '@/lib/audit/actions';
import { Database } from '@/types/database.types';

/**
 * Update athlete profile information
 * Allows updating: nickname, phone_number, health_notes, profile_picture
 * Prevents updating: club_id, first_name, last_name, email, date_of_birth, gender
 */
export async function updateAthleteProfile(
  athleteId: string,
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  try {
    const db = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser();

    if (authError || !user) {
      return { error: 'Unauthorized: please sign in' };
    }

    // Verify the athlete belongs to the current user
    const athleteQuery = await db
      .from('athletes')
      .select('*')
      .eq('id', athleteId)
      .maybeSingle();

    if (athleteQuery.error || !athleteQuery.data) {
      return { error: 'Athlete profile not found' };
    }

    const athlete = athleteQuery.data as Database['public']['Tables']['athletes']['Row'];

    if (athlete.user_id !== user.id) {
      return { error: "Unauthorized: you cannot edit another user's profile" };
    }

    // Extract allowed fields from form data
    const nickname = formData.get('nickname') as string | null;
    const phoneNumber = formData.get('phone_number') as string;
    const healthNotes = formData.get('health_notes') as string | null;
    const profilePictureFile = formData.get('profile_picture') as File | null;

    // Validate required fields
    if (!phoneNumber) {
      return { error: 'Please enter a phone number' };
    }

    // Validate phone number format (Thai phone number)
    const phoneRegex = /^[0-9]{9,10}$/;
    if (!phoneRegex.test(phoneNumber.replace(/[-\s]/g, ''))) {
      return { error: 'Invalid phone number format' };
    }

    let profilePictureUrl = null;

    // Handle profile picture upload if provided
    if (profilePictureFile && profilePictureFile.size > 0) {
      // Validate file type
      if (!profilePictureFile.type.startsWith('image/')) {
        return { error: 'Please upload an image file only' };
      }

      // Validate file size (max 5MB)
      if (profilePictureFile.size > 5 * 1024 * 1024) {
        return { error: 'File size must not exceed 5MB' };
      }

      // Generate unique filename
      const fileExt = profilePictureFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `profile-pictures/${fileName}`;

      // Upload to file storage
      const { error: uploadError } = await db.storage
        .from('avatars')
        .upload(filePath, profilePictureFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return { error: 'Error uploading image' };
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = db.storage.from('avatars').getPublicUrl(filePath);

      profilePictureUrl = publicUrl;
    }

    // Prepare update data (only allowed fields)
    const updateData: Database['public']['Tables']['athletes']['Update'] = {
      nickname: nickname || null,
      phone_number: phoneNumber,
      health_notes: healthNotes || null,
    };

    // Add profile picture URL if uploaded
    if (profilePictureUrl) {
      updateData.profile_picture_url = profilePictureUrl;
    }

    // Update athlete profile
    const { error: updateError } = await db
      .from('athletes')
      // @ts-ignore - TypeScript has issues with the update type inference
      .update(updateData)
      .eq('id', athleteId);

    if (updateError) {
      console.error('Update error:', updateError);
      return { error: 'Error updating profile' };
    }

    // Log audit event
    await createAuditLog({
      userId: user.id,
      actionType: 'athlete.update',
      entityType: 'athlete',
      entityId: athleteId,
      details: updateData,
    });

    // Revalidate the profile page
    revalidatePath('/dashboard/athlete/profile');
    revalidatePath('/dashboard/athlete/profile/edit');

    return { success: true };
  } catch (error) {
    console.error('Unexpected error in updateAthleteProfile:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get athlete profile by user ID
 */
export async function getAthleteProfile(userId: string) {
  try {
    const db = await createClient();

    const { data: athlete, error } = await db
      .from('athletes')
      .select(
        `
        *,
        clubs (
          id,
          name,
          description,
          sport_type
        )
      `
      )
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching athlete profile:', error);
      return { error: 'Profile not found' };
    }

    return { data: athlete };
  } catch (error) {
    console.error('Unexpected error in getAthleteProfile:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Update athlete profile personal information (no document upload)
 */
export async function updateAthleteProfileComplete(
  athleteId: string,
  data: {
    personalInfo: {
      full_name: string;
      nickname?: string;
      gender: 'male' | 'female' | 'other';
      date_of_birth: string;
      phone_number: string;
      address: string;
      emergency_contact: string;
      blood_type?: string;
      medical_conditions?: string;
    };
  }
): Promise<{ success?: boolean; error?: string }> {
  try {
    const db = await createClient();

    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser();

    if (authError || !user) {
      return { error: 'Unauthorized: please sign in' };
    }

    // athleteId is the athletes row id; it must belong to the signed-in user
    const { data: athlete, error: athleteError } = await db
      .from('athletes')
      .select('id, user_id')
      .eq('id', athleteId)
      .maybeSingle<{ id: string; user_id: string }>();

    if (athleteError || !athlete) {
      return { error: 'Athlete profile not found' };
    }

    if (athlete.user_id !== user.id) {
      return { error: 'Unauthorized: you can only edit your own profile' };
    }

    const fullName = data.personalInfo.full_name.trim();
    const nameParts = fullName.split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');
    const now = new Date().toISOString();

    const { error: updateError } = await db
      .from('athletes')
      .update({
        first_name: firstName,
        last_name: lastName,
        nickname: data.personalInfo.nickname || null,
        gender: data.personalInfo.gender,
        date_of_birth: data.personalInfo.date_of_birth,
        phone_number: data.personalInfo.phone_number,
        health_notes: data.personalInfo.medical_conditions || null,
        updated_at: now,
      })
      .eq('id', athleteId);

    if (updateError) {
      console.error('Update athlete error:', updateError);
      return { error: 'Failed to update athlete profile' };
    }

    const { error: profileError } = await db
      .from('profiles')
      .update({
        full_name: fullName,
        phone: data.personalInfo.phone_number,
        date_of_birth: data.personalInfo.date_of_birth,
        updated_at: now,
      })
      .eq('id', user.id);

    if (profileError) {
      console.error('Update profile error:', profileError);
    }

    const { data: application } = await (db as any)
      .from('membership_applications')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .single();

    if (application) {
      const { error: appUpdateError } = await (db as any)
        .from('membership_applications')
        .update({
          personal_info: data.personalInfo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', application.id);

      if (appUpdateError) {
        console.error('Update application error:', appUpdateError);
      }
    }

    await createAuditLog({
      userId: user.id,
      actionType: 'athlete.update' as any,
      entityType: 'athlete',
      entityId: athleteId,
      details: { personal_info: data.personalInfo },
    });

    revalidatePath('/dashboard/athlete/profile');
    revalidatePath('/dashboard/athlete/profile/edit');

    return { success: true };
  } catch (error) {
    console.error('Unexpected error in updateAthleteProfileComplete:', error);
    return { error: 'Unexpected error' };
  }
}
