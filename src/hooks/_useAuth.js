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
  const {
    getToken: clerkGetToken,
    signOut: clerkSignOut,
    isSignedIn: clerkIsSignedIn,
  } = useClerkAuth();

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
      console.log("🔍 Checking authentication state...");
      console.log("clerkIsSignedIn:", clerkIsSignedIn);
      console.log("clerkGetToken available:", !!clerkGetToken);
      console.log("isLoaded:", isLoaded);

      // Wait for Clerk to load
      if (!isLoaded) {
        console.log("⏳ Clerk still loading...");
        return null;
      }

      if (!clerkIsSignedIn) {
        console.error("❌ User not signed in");
        return null;
      }

      if (!clerkGetToken) {
        console.error("❌ clerkGetToken not available");
        return null;
      }

      console.log("🔑 Getting Clerk token...");

      // Get real Clerk session token without template
      const token = await clerkGetToken();

      if (!token) {
        console.error("❌ Failed to get real Clerk token");
        return null;
      }

      console.log(
        "✅ Successfully retrieved real Clerk token, length:",
        token.length,
      );
      console.log("🔑 Token preview:", token.substring(0, 50) + "...");
      return token;
    } catch (error) {
      console.error("❌ Error getting real Clerk token:", error);
      console.error("❌ Error details:", error.message, error.code);
      return null;
    }
  };

  /**
   * Enhanced sign out function that clears all authentication data
   * Clears Clerk session and removes all tokens from secure storage
   */
  const signOut = async () => {
    try {
      console.log("🚪 Starting sign out process...");

      // Sign out from Clerk first
      if (clerkSignOut) {
        console.log("🔐 Signing out from Clerk...");
        await clerkSignOut();
        console.log("✅ Clerk sign out completed");
      }

      // Clear ALL possible Clerk tokens from secure store
      const clerkKeys = [
        "__clerk_client_jwt",
        "__clerk_session_token",
        "__clerk_refresh_token",
        "__clerk_db_jwt",
        "__clerk_interstitial_token",
        "__clerk_frontend_api",
        "__clerk_backend_api",
        "mock_auth_token",
        // Add any other possible token keys
      ];

      console.log("🧹 Clearing secure store tokens...");
      for (const key of clerkKeys) {
        try {
          await SecureStore.deleteItemAsync(key);
          console.log(`✅ Deleted: ${key}`);
        } catch (error) {
          console.log(`ℹ️ ${key} not found or already removed`);
        }
      }

      // Force reload the app state by waiting a moment
      await new Promise((resolve) => setTimeout(resolve, 500));

      console.log("✅ Sign out completed - all authentication data cleared");
    } catch (error) {
      console.error("❌ Error during sign out:", error);
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
