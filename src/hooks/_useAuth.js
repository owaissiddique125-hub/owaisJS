import { useAuth as useClerkAuth, useUser } from "@clerk/clerk-expo";
import * as SecureStore from "expo-secure-store";

/**
 * Custom authentication hook that wraps Clerk's useUser and useAuth
 * Provides a consistent interface for authentication state across the app
 * 
 * @returns {Object} Authentication state and methods
 * @returns {Object} user - User object with id, email, name, image, phoneNumber
 * @returns {boolean} isLoaded - Whether Clerk has finished loading
 * @returns {boolean} isSignedIn - Whether user is authenticated
 * @returns {Function} signOut - Function to sign out the user and clear secure storage
 * @returns {Function} getToken - Function to get authentication token
 */
export default function useAuth() {
  const { user, isLoaded } = useUser();
  const { getToken: clerkGetToken, signOut: clerkSignOut, isSignedIn: clerkIsSignedIn } = useClerkAuth();

  // Transform Clerk user object to match app's expected format
  const transformedUser = user
    ? {
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress || "",
        name: user.fullName || user.firstName || "",
        image: user.imageUrl || "",
        phoneNumber: user.primaryPhoneNumber?.phoneNumber || "",
      }
    : null;

  // Use real Clerk authentication state
  const isSignedIn = clerkIsSignedIn;

  /**
   * Get real Clerk JWT token for API authentication
   * Only returns real Clerk tokens - no mock tokens
   */
  const getToken = async () => {
    try {
      if (!clerkIsSignedIn || !clerkGetToken) {
        console.error("User not signed in or getToken not available");
        return null;
      }

      // Get real Clerk token only
      const token = await clerkGetToken();
      
      if (!token) {
        console.error("Failed to get real Clerk token");
        return null;
      }

      console.log("Successfully retrieved real Clerk token");
      return token;
    } catch (error) {
      console.error("Error getting real Clerk token:", error);
      return null;
    }
  };

  /**
   * Enhanced sign out function that clears all authentication data
   * Clears Clerk session and removes all tokens from secure storage
   */
  const signOut = async () => {
    try {
      // Sign out from Clerk
      if (clerkSignOut) {
        await clerkSignOut();
      }
      
      // Clear any tokens from secure store
      const clerkKeys = [
        "__clerk_client_jwt",
        "__clerk_session_token",
        "__clerk_refresh_token",
        "__clerk_db_jwt",
        "mock_auth_token",
      ];
      
      for (const key of clerkKeys) {
        try {
          await SecureStore.deleteItemAsync(key);
        } catch (error) {
          console.log(`Cleanup: ${key} not found or already removed`);
        }
      }
      
      console.log("Successfully signed out and cleared all authentication data");
    } catch (error) {
      console.error("Error during sign out:", error);
      throw error;
    }
  };

  return {
    user: transformedUser,
    isLoaded,
    isSignedIn,
    signOut,
    getToken,
  };
}
