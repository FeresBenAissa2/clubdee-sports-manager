import { redirect } from 'next/navigation';

/**
 * Register Page - Redirects to Unified Registration
 * 
 * This page now redirects to /register-membership which handles
 * the complete registration flow in one place:
 * - Step 1: Create account (email + password)
 * - Step 2: Personal information
 * - Step 3: Upload documents
 * - Step 4: Select sport/club
 */
export default function RegisterPage() {
  // Redirect to unified registration page
  redirect('/register-membership');
}
