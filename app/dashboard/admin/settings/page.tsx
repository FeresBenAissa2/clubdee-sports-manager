'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Settings as SettingsIcon } from 'lucide-react';
import { getSystemSettings, updateSystemSetting, type SystemSetting } from '@/lib/admin/settings-actions';
import { useToast } from '@/hooks/useToast';

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Local state for settings
  const [requireEmailVerification, setRequireEmailVerification] = useState(false);
  const [allowSelfRegistration, setAllowSelfRegistration] = useState(true);
  const [requireCoachApproval, setRequireCoachApproval] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    const result = await getSystemSettings();

    if (result.success && result.data) {
      setSettings(result.data);

      // Set local state from database
      result.data.forEach((setting) => {
        const value = setting.setting_value === 'true' || setting.setting_value === true;
        
        switch (setting.setting_key) {
          case 'require_email_verification':
            setRequireEmailVerification(value);
            break;
          case 'allow_self_registration':
            setAllowSelfRegistration(value);
            break;
          case 'require_coach_approval':
            setRequireCoachApproval(value);
            break;
        }
      });
    } else {
      toast({
        title: 'An error occurred',
        description: result.error || 'Could not load settings',
        variant: 'error',
      });
    }

    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);

    try {
      // Update all settings
      const updates = [
        updateSystemSetting('require_email_verification', requireEmailVerification),
        updateSystemSetting('allow_self_registration', allowSelfRegistration),
        updateSystemSetting('require_coach_approval', requireCoachApproval),
      ];

      const results = await Promise.all(updates);

      const hasError = results.some((r) => !r.success);

      if (hasError) {
        toast({
          title: 'An error occurred',
          description: 'Some settings could not be saved',
          variant: 'error',
        });
      } else {
        toast({
          title: 'Saved successfully! ✅',
          description: 'System settings updated successfully',
          variant: 'default',
        });

        // Reload settings
        await loadSettings();
      }
    } catch (error) {
      toast({
        title: 'An error occurred',
        description: 'Could not save settings',
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <SettingsIcon className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">System settings</h1>
        </div>
        <p className="text-gray-600">Manage system settings, membership registration, and identity verification</p>
      </div>

      <div className="grid gap-6 max-w-4xl">
        {/* Authentication Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Identity verification</CardTitle>
            <CardDescription>
              Configure membership registration and email verification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Email Verification */}
            <div className="flex items-center justify-between space-x-4 p-4 border rounded-lg">
              <div className="flex-1">
                <Label htmlFor="email-verification" className="text-base font-medium">
                  Require email verification (OTP)
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  Enable OTP to verify email after registration
                </p>
                <p className="text-xs text-amber-600 mt-2">
                  ⚠️ Configure an SMTP provider (SendGrid, AWS SES) before enabling this
                </p>
              </div>
              <Switch
                id="email-verification"
                checked={requireEmailVerification}
                onCheckedChange={setRequireEmailVerification}
              />
            </div>

            {/* Self Registration */}
            <div className="flex items-center justify-between space-x-4 p-4 border rounded-lg">
              <div className="flex-1">
                <Label htmlFor="self-registration" className="text-base font-medium">
                  Allow self-registration
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  Users can create accounts themselves (recommended)
                </p>
              </div>
              <Switch
                id="self-registration"
                checked={allowSelfRegistration}
                onCheckedChange={setAllowSelfRegistration}
              />
            </div>
          </CardContent>
        </Card>

        {/* Membership Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Sports membership registration</CardTitle>
            <CardDescription>
              Configure sports registration steps
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Coach Approval */}
            <div className="flex items-center justify-between space-x-4 p-4 border rounded-lg">
              <div className="flex-1">
                <Label htmlFor="coach-approval" className="text-base font-medium">
                  Require coach approval
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  Athletes must wait for coach approval before access (recommended)
                </p>
                <p className="text-xs text-blue-600 mt-2">
                  💡 If disabled: athletes can access immediately after signing up
                </p>
              </div>
              <Switch
                id="coach-approval"
                checked={requireCoachApproval}
                onCheckedChange={setRequireCoachApproval}
              />
            </div>
          </CardContent>
        </Card>

        {/* Current Configuration Summary */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">Current settings summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-blue-800">OTP system:</span>
                <span className="font-medium text-blue-900">
                  {requireEmailVerification ? '🟢 Enabled' : '🔴 Disabled'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-blue-800">Self-registration:</span>
                <span className="font-medium text-blue-900">
                  {allowSelfRegistration ? 'Allowed' : 'Not allowed'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-blue-800">CoachApprove:</span>
                <span className="font-medium text-blue-900">
                  {requireCoachApproval ? 'Approval required' : 'No approval required'}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-blue-300">
              <p className="text-xs text-blue-700">
                <strong>Current flow:</strong>{' '}
                {requireEmailVerification
                  ? 'Sign up → verify OTP → apply for sport'
                  : 'Sign up → apply for sport'}{' '}
                →{' '}
                {requireCoachApproval
                  ? 'Await coach approval → access'
                  : 'Immediate access'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            size="lg"
            className="min-w-[200px]"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save settings
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
