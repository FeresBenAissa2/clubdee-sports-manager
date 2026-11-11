'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { User, Upload, Loader2 } from 'lucide-react';
import { updateAthleteProfile } from '@/lib/athlete/actions';

interface Athlete {
  id: string;
  user_id: string;
  club_id: string;
  first_name: string;
  last_name: string;
  nickname?: string;
  date_of_birth: string;
  phone_number: string;
  email: string;
  gender: string;
  health_notes?: string;
  profile_picture_url?: string;
  clubs?: {
    id: string;
    name: string;
  };
}

interface ProfileEditFormProps {
  athlete: Athlete;
}

export default function ProfileEditForm({ athlete }: ProfileEditFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    athlete.profile_picture_url || null
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file only.');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must not exceed 5 MB.');
        return;
      }

      setProfilePicture(file);
      setError(null);

      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    // Add profile picture if selected
    if (profilePicture) {
      formData.append('profile_picture', profilePicture);
    }

    try {
      const result = await updateAthleteProfile(athlete.id, formData);

      if (result.error) {
        setError(result.error);
      } else {
        // Redirect back to profile page
        router.push('/dashboard/athlete/profile');
        router.refresh();
      }
    } catch (err) {
      setError('An error occurred while updating your profile');
      console.error('Profile update error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Profile Picture */}
        <div className="space-y-2">
          <Label>Profile photo</Label>
          <div className="flex items-center gap-4">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gray-100">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Profile preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-12 w-12 text-gray-400" />
              )}
            </div>
            <div>
              <Label
                htmlFor="profile_picture"
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                <Upload className="h-4 w-4" />
                Choose image
              </Label>
              <Input
                id="profile_picture"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <p className="mt-1 text-xs text-gray-500">
                JPG, PNG, or GIF (max 5 MB)
              </p>
            </div>
          </div>
        </div>

        {/* Nickname */}
        <div className="space-y-2">
          <Label htmlFor="nickname">Nickname</Label>
          <Input
            id="nickname"
            name="nickname"
            type="text"
            defaultValue={athlete.nickname || ''}
            placeholder="Your nickname"
          />
        </div>

        {/* Phone Number */}
        <div className="space-y-2">
          <Label htmlFor="phone_number">Phone number</Label>
          <Input
            id="phone_number"
            name="phone_number"
            type="tel"
            defaultValue={athlete.phone_number}
            placeholder="0812345678"
            required
          />
        </div>

        {/* Health Notes */}
        <div className="space-y-2">
          <Label htmlFor="health_notes">Health notes</Label>
          <textarea
            id="health_notes"
            name="health_notes"
            rows={4}
            defaultValue={athlete.health_notes || ''}
            placeholder="Medical conditions, allergies, or other health info your coach should know"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Read-only fields */}
        <div className="space-y-4 rounded-lg bg-gray-50 p-4">
          <p className="text-sm font-medium text-gray-700">
            Information that cannot be edited
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-gray-600">Full name</Label>
              <p className="mt-1 text-sm font-medium text-gray-900">
                {athlete.first_name} {athlete.last_name}
              </p>
            </div>
            <div>
              <Label className="text-gray-600">Email</Label>
              <p className="mt-1 text-sm font-medium text-gray-900">
                {athlete.email}
              </p>
            </div>
            <div>
              <Label className="text-gray-600">Date of birth</Label>
              <p className="mt-1 text-sm font-medium text-gray-900">
                {new Date(athlete.date_of_birth).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div>
              <Label className="text-gray-600">Gender</Label>
              <p className="mt-1 text-sm font-medium text-gray-900">
                {athlete.gender === 'male'
                  ? 'Male'
                  : athlete.gender === 'female'
                    ? 'Female'
                    : 'Other'}
              </p>
            </div>
            <div>
              <Label className="text-gray-600">Club</Label>
              <p className="mt-1 text-sm font-medium text-gray-900">
                {athlete.clubs?.name || 'Not specified'}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            To change this information Please contact an administrator or your coach
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save changes'
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
