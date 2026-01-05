import { useUser, SignedIn, SignedOut } from "@clerk/clerk-expo";
import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGoogleLogin } from "../src/utils/googleAuth";

const LoginScreen = () => {
  const { isLoaded: isUserLoaded, user, isSignedIn } = useUser();
  const router = useRouter();
  const handleGoogleLogin = useGoogleLogin();
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState(null);

  // Redirect if already logged in
  React.useEffect(() => {
    if (isUserLoaded && isSignedIn && user) {
      console.log("User already signed in, redirecting to admin panel");
      router.replace("/tab/adminpannel");
    }
  }, [isUserLoaded, isSignedIn, user, router]);

  return (
    <SafeAreaView style={styles.container}>
      <SignedIn>
        <View style={styles.userStatus}>
          <Text style={styles.userStatusText}>✅ Already signed in!</Text>
          <Text style={styles.userSubText}>Redirecting to admin panel...</Text>
          <ActivityIndicator size="small" color="#4CAF50" />
        </View>
      </SignedIn>

      <SignedOut>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Admin Panel</Text>
          <Text style={styles.subtitle}>Sign in with Google to continue</Text>
        </View>

        {/* Google Login Button */}
        <TouchableOpacity
          style={[
            styles.googleButton,
            isLoading && loadingProvider === "oauth_google" && styles.loginButtonDisabled,
          ]}
          onPress={() => handleGoogleLogin(setIsLoading, setLoadingProvider)}
          disabled={isLoading}
        >
          {isLoading && loadingProvider === "oauth_google" ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.buttonContent}>
              <Text style={styles.loginButtonText}>Continue with Google</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Instructions */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Click the button above to sign in with your Google account
          </Text>
        </View>
      </SignedOut>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    marginBottom: 40,
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  userStatus: {
    backgroundColor: "#e8f5e8",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#4CAF50",
    alignItems: "center",
  },
  userStatusText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2E7D32",
    marginBottom: 5,
  },
  userSubText: {
    fontSize: 14,
    color: "#666",
  },
  googleButton: {
    backgroundColor: "#4285F4",
    borderRadius: 10,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 20,
    flexDirection: "row",
    paddingHorizontal: 20,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  footer: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
});

export default LoginScreen;
