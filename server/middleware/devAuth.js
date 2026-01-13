const { clerkClient } = require("@clerk/clerk-sdk-node");
const { syncUserWithSupabase } = require("../utils/clerkSupabaseSync");

/**
 * Development-friendly authentication middleware
 * In development, accepts mock tokens for testing
 * In production, requires real Clerk authentication
 */
const devAuth = async (req, res, next) => {
  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: {
          code: "NO_TOKEN",
          message: "No authorization token provided",
        },
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Development mode: Handle mock tokens
    if (process.env.NODE_ENV !== "production" && token === "mock_dev_token") {
      console.log("🔧 Using mock authentication for development");

      const mockUser = {
        userId: "dev_user_123",
        sessionId: "dev_session_456",
        claims: { sub: "dev_user_123", sid: "dev_session_456" },
        isMock: true,
      };

      req.auth = mockUser;

      // Try to sync with Supabase
      try {
        const supabaseUser = await syncUserWithSupabase(mockUser.userId);
        req.auth.supabaseUserId = supabaseUser?.id;
        console.log(`✅ Mock user synced with Supabase: ${supabaseUser?.id}`);
      } catch (syncError) {
        console.warn("⚠️ Mock user Supabase sync failed:", syncError.message);
      }

      return next();
    }

    // Production or real token: Verify with Clerk
    try {
      const verifiedToken = await clerkClient.verifyToken(token);

      req.auth = {
        userId: verifiedToken.sub,
        sessionId: verifiedToken.sid,
        claims: verifiedToken,
        isMock: false,
      };

      console.log(`✅ Successfully authenticated user: ${verifiedToken.sub}`);

      // Sync user with Supabase (non-blocking)
      try {
        const supabaseUser = await syncUserWithSupabase(verifiedToken.sub);
        req.auth.supabaseUserId = supabaseUser?.id;
        console.log(`✅ User synced with Supabase: ${supabaseUser?.id}`);
      } catch (syncError) {
        console.error(
          "⚠️ Supabase sync failed (continuing):",
          syncError.message,
        );
      }

      next();
    } catch (tokenError) {
      console.error("❌ Token verification failed:", tokenError.message);
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message:
            "Invalid or expired token. Use 'mock_dev_token' for development testing.",
        },
      });
    }
  } catch (error) {
    console.error("❌ Auth middleware error:", {
      message: error.message,
      type: error.name,
      timestamp: new Date().toISOString(),
    });

    return res.status(401).json({
      success: false,
      error: {
        code: "AUTH_ERROR",
        message: "Authentication error occurred.",
      },
    });
  }
};

module.exports = devAuth;
