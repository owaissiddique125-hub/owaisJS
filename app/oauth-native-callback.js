import { Redirect } from "expo-router";

export default function Page() {
  // Jab URL hit hoga, ye file detect hogi aur user ko agay bhej degi
  return <Redirect href="/tab/adminpannel" />;
}