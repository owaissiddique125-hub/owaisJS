import { useOAuth } from "@clerk/clerk-expo";
import * as AuthSession from "expo-auth-session";
import { useRouter } from "expo-router";
import { Alert } from "react-native";

/**
 * Google Login Function
 * This function handles Google OAuth authentication using Clerk and Expo
 *
 * @returns {Function} handleGoogleLogin - Function to call when Google login button is pressed
 */
export const useGoogleLogin = () => {
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({
    strategy: "oauth_google",
  });
  const router = useRouter();

  const handleGoogleLogin = async (setIsLoading, setLoadingProvider) => {
    try {
      setIsLoading(true);
      setLoadingProvider("oauth_google");

      console.log("Starting Google OAuth...");

      // Use Expo's AuthSession to create redirect URI with proxy (works in Expo Go)
      const { createdSessionId, setActive } = await startGoogleOAuth({
        redirectUrl: AuthSession.makeRedirectUri({
          scheme: "admin", // Ye aapki app.json wali scheme hai
          path: "oauth-native-callback",
        }),
      });

      console.log("OAuth result - Session ID:", createdSessionId);

      // Check if session was created successfully
      if (createdSessionId) {
        try {
          // Activate the session - this is important for Expo
          await setActive({ session: createdSessionId });

          console.log(
            "Session activated successfully, redirecting to admin panel...",
          );

          // Redirect to admin panel
          router.replace("/tab/adminpannel");
        } catch (sessionError) {
          console.error("Session activation error:", sessionError);

          // Handle session activation errors
          let errorMessage = "Failed to activate session. Please try again.";

          if (sessionError?.errors && Array.isArray(sessionError.errors)) {
            const errorMessages = sessionError.errors
              .map((err) => err.message || err.longMessage)
              .filter(Boolean);

            if (errorMessages.length > 0) {
              errorMessage = errorMessages.join("\n");
            }
          } else if (sessionError?.message) {
            errorMessage = sessionError.message;
          }

          Alert.alert("Session Error", errorMessage, [{ text: "OK" }]);
        }
      } else {
        // OAuth was cancelled or didn't complete
        console.log("OAuth cancelled or incomplete");
        Alert.alert(
          "Login Cancelled",
          "The Google login process was cancelled or incomplete.",
          [{ text: "OK" }],
        );
      }
    } catch (error) {
      console.error("Google login error:", error);

      // Handle different error types
      let errorMessage =
        "An error occurred during Google login. Please try again.";

      if (error?.errors && Array.isArray(error.errors)) {
        const errorMessages = error.errors
          .map((err) => err.message || err.longMessage)
          .filter(Boolean);

        if (errorMessages.length > 0) {
          errorMessage = errorMessages.join("\n");
        }
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.code === "ERR_INVALID_REDIRECT") {
        errorMessage =
          "Invalid redirect URL. Please check your OAuth configuration in Clerk dashboard.";
      } else if (error?.status === 401 || error?.status === 403) {
        errorMessage =
          "Authentication failed. Please check your Clerk configuration.";
      }

      Alert.alert("Login Error", errorMessage, [{ text: "OK" }]);
    } finally {
      setIsLoading(false);
      setLoadingProvider(null);
    }
  };

  return handleGoogleLogin;
};
