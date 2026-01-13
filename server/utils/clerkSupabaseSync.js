const { clerkClient } = require("@clerk/clerk-sdk-node");
const supabase = require("../supabase/supbase");

/**
 * Sync Clerk user with Supabase database
 * Creates or updates user record in Supabase when Clerk user is authenticated
 */
const syncUserWithSupabase = async (clerkUserId) => {
  try {
    console.log("🔄 Syncing Clerk user with Supabase:", clerkUserId);

    // Get user details from Clerk
    const clerkUser = await clerkClient.users.getUser(clerkUserId);

    if (!clerkUser) {
      console.error("❌ Clerk user not found:", clerkUserId);
      return null;
    }

    console.log("👤 Clerk user data:", {
      id: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress,
      name: clerkUser.fullName || clerkUser.firstName,
    });

    // Prepare user data for Supabase
    const userData = {
      clerk_user_id: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress || null,
      name: clerkUser.fullName || clerkUser.firstName || null,
      profile_image: clerkUser.imageUrl || null,
      phone_number: clerkUser.primaryPhoneNumber?.phoneNumber || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log("💾 Saving to Supabase:", userData);

    // Upsert user in Supabase (create if not exists, update if exists)
    const { data: user, error } = await supabase
      .from("users")
      .upsert(userData, {
        onConflict: "clerk_user_id",
        returning: "*",
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Supabase sync error:", error);
      throw error;
    }

    console.log("✅ User synced with Supabase:", user);
    return user;
  } catch (error) {
    console.error("❌ Error syncing user with Supabase:", error);
    throw error;
  }
};

/**
 * Create users table in Supabase if it doesn't exist
 * This should be run once during setup
 */
const createUsersTable = async () => {
  try {
    const { error } = await supabase.rpc("create_users_table_if_not_exists");

    if (error && !error.message.includes("already exists")) {
      console.error("❌ Error creating users table:", error);
      return false;
    }

    console.log("✅ Users table ready");
    return true;
  } catch (error) {
    console.error("❌ Error setting up users table:", error);
    return false;
  }
};

module.exports = {
  syncUserWithSupabase,
  createUsersTable,
};
