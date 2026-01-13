import { ClerkProvider } from "@clerk/clerk-expo";
import { Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Token cache for Clerk with proper cleanup
const secureTokenCache = {
  async getToken(key: string) {
    try {
      const token = await SecureStore.getItemAsync(key);
      console.log(`🔍 Getting token for key: ${key}, found: ${!!token}`);
      return token;
    } catch (err) {
      console.error(`Error getting token for ${key}:`, err);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      console.log(`💾 Saving token for key: ${key}`);
      await SecureStore.setItemAsync(key, value);
    } catch (err) {
      console.error("Error saving token:", err);
    }
  },
  async deleteToken(key: string) {
    try {
      console.log(`🗑️ Deleting token for key: ${key}`);
      await SecureStore.deleteItemAsync(key);
    } catch (err) {
      console.error(`Error deleting token for ${key}:`, err);
    }
  },
};

export default function RootLayout() {
  const clerkPublishableKey =
    process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    "pk_live_Y2xlcmsub3dhaXMuZnVuJA";

  console.log("🔑 Clerk Publishable Key:", clerkPublishableKey);
  console.log("🔑 Clerk Key length:", clerkPublishableKey?.length);

  if (!clerkPublishableKey) {
    console.warn(
      "Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Make sure it's set in your .env file or environment variables.",
    );
  }

  return (
    <SafeAreaProvider>
      <ClerkProvider
        publishableKey={clerkPublishableKey}
        tokenCache={secureTokenCache}
      >
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="tab" options={{ headerShown: false }} />
          <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        </Stack>
      </ClerkProvider>
    </SafeAreaProvider>
  );
}
