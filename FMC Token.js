export const updateAdminToken = async () => {
  try {
    const token = await messaging().getToken();

    // Yahan hum 'expo_token' column use kar rahe hain kyunke aapki DB mein yahi naam hai
    const { error } = await supabase.from("admin_config").upsert({
      id: 1, // Agar id 1 ki row nahi hai to ye nayi bana dega (Upsert is better)
      expo_token: token,
      updated_at: new Date(),
    });

    if (error) throw error;
    console.log("FCM Token successfully saved in Supabase!");
  } catch (err) {
    console.error("Database update error:", err.message);
  }
};
