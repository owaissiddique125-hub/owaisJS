import { ClerkProvider } from "@clerk/clerk-expo";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import supabase from "../supabase/supbase";

// 1. Notification Settings (App khuli ho tab bhi dikhayega)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Clerk Token Cache
const secureTokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (err) {
      console.error("Error saving token:", err);
    }
  },
  async deleteToken(key: string) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (err) {
      console.error("Error deleting token:", err);
    }
  },
};

export default function RootLayout() {
  const router = useRouter();
  const clerkPublishableKey = "pk_live_Y2xlcmsub3dhaXMuZnVuJA";

  useEffect(() => {
    // 2. Token setup aur Supabase mein save karne ka function
    async function setupAdminNotifications() {
      if (!Device.isDevice) {
        console.log("Simulator detected. Push notifications won't work.");
        return;
      }

      // Permissions mangna
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("Notification permission denied!");
        return;
      }

      // Token nikalna
      try {
        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ||
          Constants?.easConfig?.projectId;
        const token = (await Notifications.getExpoPushTokenAsync({ projectId }))
          .data;
        console.log("🚀 Admin Expo Token:", token);

        // Supabase mein save karna (Upsert ka matlab hai update ya insert)
        const { error } = await supabase
          .from("admin_config")
          .upsert({ id: 1, expo_token: token, updated_at: new Date() });

        if (error) console.error("❌ DB Save Error:", error.message);
        else console.log("✅ Token successfully saved to Supabase!");
      } catch (error) {
        console.error("❌ Error getting token:", error);
      }
    }

    setupAdminNotifications();

    // 3. Listener: Jab notification par CLICK karein
    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("Notification clicked, redirecting...");
        router.push("/tab/adminpannel"); // Path verify kar lena
      });

    return () => {
      if (responseListener) {
        responseListener.remove();
      }
    };
  }, []);

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
