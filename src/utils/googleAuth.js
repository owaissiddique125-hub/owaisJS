import { useOAuth } from "@clerk/clerk-expo";
import * as AuthSession from "expo-auth-session";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Alert } from "react-native";

WebBrowser.maybeCompleteAuthSession();

export const useGoogleLogin = () => {
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({
    strategy: "oauth_google",
  });

  const router = useRouter();

  const handleGoogleLogin = async (setIsLoading, setLoadingProvider) => {
    try {
      setIsLoading(true);
      setLoadingProvider("oauth_google");

      // ✅ YAHAN lagana hai
      const redirectUrl = AuthSession.makeRedirectUri({
         scheme: "admin",
         path: "oauth-native-callback",
      });

      console.log("Expo Auth Redirect URL:", redirectUrl);

      const { createdSessionId, setActive } = await startGoogleOAuth({
        redirectUrl,
      });

      if (createdSessionId) {
        await setActive({ session: createdSessionId });
        router.replace("/tab/adminpannel");
      } else {
        Alert.alert("Login Cancelled", "Google login cancel ho gaya");
      }
    } catch (error) {
      console.error("Google login error:", error);
      Alert.alert("Login Error", error.message || "Login failed");
    } finally {
      setIsLoading(false);
      setLoadingProvider(null);
    }
  };

  return handleGoogleLogin;
};
