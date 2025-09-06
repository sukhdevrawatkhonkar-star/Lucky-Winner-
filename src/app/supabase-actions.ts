// src/app/supabase-actions.ts
'use server';

import { adminAuth } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase';
import type { DecodedIdToken } from 'firebase-admin/auth';

// Types - It's good practice to define types that are shared or used across functions.
interface UserProfile {
  id: string; // Should match Firebase UID
  email: string;
  name: string;
  wallet_limit?: number; // Using snake_case to match Supabase conventions
  plan?: string;
  agent_custom_id?: string;
}

/**
 * Verifies the Firebase Authentication token.
 * This is a critical security step for all protected server actions.
 * @param authToken The Firebase ID token from the client.
 * @returns The decoded token if valid.
 * @throws An error if the token is missing or invalid.
 */
async function verifyAuthToken(authToken: string): Promise<DecodedIdToken> {
  if (!authToken || !authToken.startsWith('Bearer ')) {
    throw new Error('Missing or malformed authorization token.');
  }
  const token = authToken.split('Bearer ')[1];

  try {
    return await adminAuth.verifyIdToken(token);
  } catch (err) {
    console.error('Error verifying auth token:', err);
    throw new Error('Invalid or expired authorization token.');
  }
}

/**
 * Fetches the user profile from Supabase for the authenticated user.
 * @param authToken The user's Firebase ID token.
 * @returns The user's profile data.
 */
export async function getUserProfile(
  authToken: string
): Promise<UserProfile> {
  const decodedToken = await verifyAuthToken(authToken);
  const userId = decodedToken.uid;

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Supabase error getting profile:', error.message);
    throw new Error('User profile not found.');
  }

  return data as UserProfile;
}

/**
 * Updates the wallet limit for the authenticated user.
 * @param authToken The user's Firebase ID token.
 * @param newLimit The new wallet limit to set.
 * @returns A success message.
 */
export async function updateWalletLimit(
  authToken: string,
  newLimit: number
): Promise<{ success: boolean; message: string }> {
  const decodedToken = await verifyAuthToken(authToken);
  const userId = decodedToken.uid;

  // Added server-side validation for the input
  if (typeof newLimit !== 'number' || newLimit < 0) {
    throw new Error('Invalid wallet limit provided.');
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ wallet_limit: newLimit })
    .eq('id', userId);

  if (error) {
    console.error('Supabase error updating wallet limit:', error.message);
    throw new Error('Failed to update wallet limit.');
  }

  return { success: true, message: 'Wallet limit updated successfully.' };
}

/**
 * Retrieves the plan for the authenticated user.
 * @param authToken The user's Firebase ID token.
 * @returns The user's current plan.
 */
export async function getUserPlan(
  authToken: string
): Promise<{ plan: string }> {
  const decodedToken = await verifyAuthToken(authToken);
  const userId = decodedToken.uid;

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('plan')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Supabase error getting user plan:', error.message);
    throw new Error('User plan not found.');
  }

  return { plan: data.plan || 'free' };
}

/**
 * Updates the agent associated with a specific user.
 * This function now includes a check to ensure only authorized admins can perform this action.
 * @param authToken The admin's Firebase ID token.
 * @param userId The ID of the user to update.
 * @param agentCustomId The new agent custom ID to assign.
 * @returns A success message.
 */
export async function updateUserAgent(
  authToken: string,
  userId: string,
  agentCustomId: string | null
): Promise<{ success: boolean; message: string }> {
  const decodedToken = await verifyAuthToken(authToken);

  // Security Enhancement: Ensure only admins can call this function.
  // This requires you to have a 'role' custom claim on your admin users' Firebase tokens.
  if (decodedToken.role !== 'admin') {
     throw new Error('Permission denied. Only admins can update user agents.');
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ agent_custom_id: agentCustomId })
    .eq('id', userId);

  if (error) {
    console.error('Supabase error updating user agent:', error.message);
    throw new Error('Failed to update user agent.');
  }

  return { success: true, message: 'User agent updated successfully.' };
}
