import { ClerkProvider, SignedIn, SignedOut } from "@clerk/clerk-expo";
import { Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { SafeAreaProvider } from "react-native-safe-area-context";








// Token cache for Clerk
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
    const clerkPublishableKey ="pk_test_cmVndWxhci1xdWFnZ2EtOTIuY2xlcmsuYWNjb3VudHMuZGV2JA";
  
    



  if (!clerkPublishableKey) {
    console.warn(
      "Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Make sure it's set in your .env file or environment variables."
    );
  }
  
  return (
  <SafeAreaProvider>
    <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={secureTokenCache}>
     <Stack screenOptions={{headerShown:false,}}>
       <SignedIn>
         <Stack.Screen name="tab" options={{headerShown:false}}/>
         <Stack.Screen name="index"/>        
       </SignedIn>
      
       <SignedOut>
        <Stack.Screen name="index"/>
       </SignedOut>
       </Stack>
    </ClerkProvider>
  </SafeAreaProvider>
  );
}