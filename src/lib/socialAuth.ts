import * as AppleAuthentication from 'expo-apple-authentication';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const googleConfig = Constants.expoConfig?.extra?.google as
  | { iosClientId?: string; webClientId?: string }
  | undefined;

/**
 * Sentinel for a user who backed out of the native sheet. Both SDKs report this
 * as an error, but it is not one — surfacing an alert for it makes tapping
 * "Cancel" look like a bug.
 */
export const AUTH_CANCELLED = 'AUTH_CANCELLED';

export class SocialAuthError extends Error {
  constructor(
    message: string,
    readonly code?: string
  ) {
    super(message);
    this.name = 'SocialAuthError';
  }
}

/** Sign In with Apple only exists on iOS, and only on iOS 13+. */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

export function isGoogleSignInConfigured(): boolean {
  return !!googleConfig?.iosClientId && !!googleConfig?.webClientId;
}

/**
 * Returns the Apple identity token for `supabase.auth.signInWithIdToken`.
 *
 * Apple sends the full name **only on the very first authorisation** for a
 * given Apple ID. On every later sign-in those fields are null, which is why
 * the name is returned here for the caller to persist immediately rather than
 * fetched later — there is no second chance to read it.
 */
export async function getAppleCredential(): Promise<{
  identityToken: string;
  fullName: string | null;
}> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new SocialAuthError('Apple did not return an identity token.');
    }

    const name = [credential.fullName?.givenName, credential.fullName?.familyName]
      .filter(Boolean)
      .join(' ')
      .trim();

    return { identityToken: credential.identityToken, fullName: name || null };
  } catch (error: any) {
    if (error?.code === 'ERR_REQUEST_CANCELED') {
      throw new SocialAuthError('Cancelled', AUTH_CANCELLED);
    }
    throw error;
  }
}

/**
 * Returns the Google ID token for `supabase.auth.signInWithIdToken`.
 *
 * The module is required lazily because the Google SDK is a native module:
 * importing it at the top level throws in Expo Go and in any JS-only context
 * such as the test runner, even when this function is never called.
 */
export async function getGoogleIdToken(): Promise<{
  idToken: string;
  fullName: string | null;
}> {
  if (!isGoogleSignInConfigured()) {
    throw new SocialAuthError('Google sign-in is not configured.');
  }

  // Deliberate: a static import of this native module throws at load time
  // wherever the native side is absent (Expo Go, Jest), even if sign-in is
  // never invoked.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { GoogleSignin, statusCodes } = require('@react-native-google-signin/google-signin');

  GoogleSignin.configure({
    iosClientId: googleConfig!.iosClientId,
    webClientId: googleConfig!.webClientId,
  });

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();

    // v13+ returns { type, data }; older versions returned the user object
    // directly. Accept both so a minor SDK bump cannot silently break login.
    const data = response?.data ?? response;
    const idToken = data?.idToken ?? response?.idToken;

    if (response?.type === 'cancelled') {
      throw new SocialAuthError('Cancelled', AUTH_CANCELLED);
    }
    if (!idToken) {
      throw new SocialAuthError('Google did not return an ID token.');
    }

    const name: string | null = data?.user?.name ?? null;
    return { idToken, fullName: name };
  } catch (error: any) {
    if (
      error?.code === statusCodes?.SIGN_IN_CANCELLED ||
      error?.code === statusCodes?.IN_PROGRESS
    ) {
      throw new SocialAuthError('Cancelled', AUTH_CANCELLED);
    }
    throw error;
  }
}
