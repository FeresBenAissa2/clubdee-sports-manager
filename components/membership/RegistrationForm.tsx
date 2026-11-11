'use client';

/**
 * Multi-step membership registration:
 * 1. Account creation (skipped when already signed in)
 * 2. Personal information
 * 3. Sport / club selection
 *
 * Document upload omitted for the school project.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AccountCreationForm from './AccountCreationForm';
import PersonalInfoForm from './PersonalInfoForm';
import { SportSelection } from './SportSelection';
import { signUp } from '@/lib/auth/actions';
import { submitApplication } from '@/lib/membership/actions';
import { validateEmail, validatePassword } from '@/lib/auth/validation';
import { personalInfoSchema, type PersonalInfoInput } from '@/lib/membership/validation';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

type Step = 1 | 2 | 3;

interface RegistrationFormProps {
  onSuccess?: () => void;
  onAccountCreated?: () => void;
  initialUserId?: string;
  initialEmail?: string;
  startStep?: Step;
}

interface FormState {
  account: {
    email: string;
    password: string;
    confirmPassword: string;
  };
  personalInfo: PersonalInfoInput;
  clubId: string;
}

const STEP_LABELS = ['Account', 'Personal info', 'Sport'] as const;

export default function RegistrationForm({
  onSuccess,
  onAccountCreated,
  initialUserId,
  initialEmail,
  startStep = 1,
}: RegistrationFormProps) {
  const minStep: Step = initialUserId ? 2 : 1;
  const [currentStep, setCurrentStep] = useState<Step>(
    startStep < minStep ? minStep : startStep
  );
  const [userId, setUserId] = useState<string | null>(initialUserId ?? null);
  const [formData, setFormData] = useState<FormState>({
    account: {
      email: initialEmail ?? '',
      password: '',
      confirmPassword: '',
    },
    personalInfo: {
      full_name: '',
      nickname: '',
      gender: '' as PersonalInfoInput['gender'],
      date_of_birth: '',
      phone_number: '',
      address: '',
      emergency_contact: '',
      blood_type: '',
      medical_conditions: '',
    },
    clubId: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const goToStep = (step: Step) => {
    requestAnimationFrame(() => {
      setCurrentStep(step);
      setValidationErrors({});
      setSubmitError(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  const validateStep1 = (): boolean => {
    const errors: Record<string, string> = {};
    const emailValidation = validateEmail(formData.account.email);
    if (!emailValidation.isValid) errors.email = emailValidation.errors[0];
    const passwordValidation = validatePassword(formData.account.password);
    if (!passwordValidation.isValid) errors.password = passwordValidation.errors[0];
    if (formData.account.password !== formData.account.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = (): boolean => {
    try {
      personalInfoSchema.parse(formData.personalInfo);
      setValidationErrors({});
      return true;
    } catch (error: any) {
      const errors: Record<string, string> = {};
      if (error.errors) {
        error.errors.forEach((err: any) => {
          errors[err.path[0]] = err.message;
        });
      }
      setValidationErrors(errors);
      return false;
    }
  };

  const validateStep3 = (): boolean => {
    if (!formData.clubId) {
      setSubmitError('Please choose a sport');
      return false;
    }
    setSubmitError(null);
    return true;
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!validateStep1()) return;
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        const result = await signUp(formData.account.email, formData.account.password);
        if (!result.success) {
          setSubmitError(result.error || 'Account creation failed');
          setIsSubmitting(false);
          return;
        }
        if (result.userId) setUserId(result.userId);
        onAccountCreated?.();
        setFormData((prev) => ({
          ...prev,
          account: { ...prev.account, password: '', confirmPassword: '' },
        }));
        setIsSubmitting(false);
        goToStep(2);
      } catch {
        setSubmitError('Unexpected error while creating the account');
        setIsSubmitting(false);
      }
      return;
    }

    if (currentStep === 2 && validateStep2()) {
      goToStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep > minStep) {
      goToStep((currentStep - 1) as Step);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep3()) return;
    if (!userId) {
      setSubmitError('User session missing. Please sign in again.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await submitApplication({
        club_id: formData.clubId,
        personal_info: formData.personalInfo,
        documents: [],
      });

      if (result.success) {
        onSuccess?.();
      } else {
        setSubmitError(result.error || 'Could not submit the application');
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      setSubmitError('Unexpected error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPercentage = (currentStep / 3) * 100;

  return (
    <div className="max-w-4xl mx-auto" translate="no">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Membership application</CardTitle>
          <CardDescription>Three short steps and you&apos;re on your way to your first session.</CardDescription>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Step {currentStep} of 3
              </span>
              <span className="text-sm text-gray-500">{STEP_LABELS[currentStep - 1]}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            {([1, 2, 3] as const).map((step, index) => (
              <div key={step} className="contents">
                {index > 0 && <div className="flex-1 h-0.5 bg-gray-200 mx-2" />}
                <div className="flex items-center space-x-2">
                  <div
                    className={`relative w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      currentStep >= step
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    <span className={currentStep > step ? 'invisible' : ''}>{step}</span>
                    <CheckCircle2
                      className={`w-5 h-5 absolute ${currentStep > step ? '' : 'invisible'}`}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700 hidden sm:inline">
                    {STEP_LABELS[step - 1]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {!initialUserId && (
            <div
              className={currentStep === 1 ? 'space-y-6' : 'hidden'}
              aria-hidden={currentStep !== 1}
              {...(currentStep !== 1 ? { inert: true } : {})}
            >
              <AccountCreationForm
                value={formData.account}
                onChange={(account) => setFormData((prev) => ({ ...prev, account }))}
                errors={currentStep === 1 ? validationErrors : {}}
              />
              {currentStep === 1 && submitError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{submitError}</p>
                </div>
              ) : null}
            </div>
          )}

          <div
            className={currentStep === 2 ? 'space-y-6' : 'hidden'}
            aria-hidden={currentStep !== 2}
            {...(currentStep !== 2 ? { inert: true } : {})}
          >
            <PersonalInfoForm
              value={formData.personalInfo}
              onChange={(personalInfo) => setFormData((prev) => ({ ...prev, personalInfo }))}
              errors={currentStep === 2 ? validationErrors : {}}
            />
          </div>

          <div
            className={currentStep === 3 ? 'space-y-6' : 'hidden'}
            aria-hidden={currentStep !== 3}
            {...(currentStep !== 3 ? { inert: true } : {})}
          >
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                Choose the sport you want to train in.
              </p>
              <p className="text-xs text-blue-700 mt-2">
                The coach of that sport reviews your application and welcomes you to the group.
              </p>
            </div>

            <SportSelection
              onSelect={(clubId) => {
                setFormData((prev) => ({ ...prev, clubId }));
                setSubmitError(null);
              }}
              selectedClubId={formData.clubId}
            />

            {formData.clubId && !submitError ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-800">
                  Sport selected. Click &quot;Submit application&quot; to continue.
                </p>
              </div>
            ) : null}

            {currentStep === 3 && submitError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{submitError}</p>
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={currentStep <= minStep || isSubmitting}
            >
              Back
            </Button>

            {currentStep < 3 ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={isSubmitting}
                className="min-w-[120px]"
              >
                {isSubmitting && currentStep === 1 ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Next'
                )}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !formData.clubId}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit application'
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
