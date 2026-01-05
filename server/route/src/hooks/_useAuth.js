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
 */
export  default function useAuth() {
  const { user, isLoaded } = useUser();
  const { signOut: clerkSignOut, isSignedIn } = useClerkAuth();

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

  /**
   * Enhanced sign out function that clears all authentication data
   * Clears Clerk session and removes all tokens from secure storage
   */
  const signOut = async () => {
    try {
      // Sign out from Clerk (this will trigger token removal via tokenCache)
      await clerkSignOut();
      
      // Additional cleanup: Clear any remaining Clerk tokens from secure store
      // Clerk uses keys like "__clerk_client_jwt", "__clerk_session_token", etc.
      const clerkKeys = [
        "__clerk_client_jwt",
        "__clerk_session_token",
        "__clerk_refresh_token",
        "__clerk_db_jwt",
      ];
      
      for (const key of clerkKeys) {
        try {
          await SecureStore.deleteItemAsync(key);
        } catch (error) {
          // Key might not exist, continue cleanup
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
  };
}
