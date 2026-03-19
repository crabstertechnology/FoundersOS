'use client';
import {
  Auth,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

/** 
 * Initiate anonymous sign-in (non-blocking). 
 * Handled via onAuthStateChanged in the provider.
 */
export function initiateAnonymousSignIn(authInstance: Auth): void {
  signInAnonymously(authInstance).catch((error) => {
    console.warn("Anonymous login failed:", error.code);
  });
}

/** 
 * Email/password sign-up. 
 * Returns promise for UI feedback.
 */
export function initiateEmailSignUp(authInstance: Auth, email: string, password: string) {
  return createUserWithEmailAndPassword(authInstance, email, password);
}

/** 
 * Email/password sign-in. 
 * Returns promise for UI feedback.
 */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string) {
  return signInWithEmailAndPassword(authInstance, email, password);
}

/** 
 * Sign-out.
 */
export function initiateSignOut(authInstance: Auth): void {
  signOut(authInstance).catch((error) => {
    console.warn("Sign out failed:", error.code);
  });
}
