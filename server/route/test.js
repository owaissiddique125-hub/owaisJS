const express = require("express");
const router = express.Router();
const clerkAuth = require("../middleware/clerkAuth");

/**
 * GET /api/test/auth
 * Test endpoint to check authentication and user sync
 */
router.get("/auth", clerkAuth, async (req, res) => {
  try {
    res.json({
      success: true,
      message: "Authentication successful",
      auth: {
        userId: req.auth.userId,
        sessionId: req.auth.sessionId,
        supabaseUserId: req.auth.supabaseUserId,
        isMock: req.auth.isMock,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: "TEST_ERROR",
        message: error.message,
      },
    });
  }
});

/**
 * GET /api/test/debug-auth
 * Debug endpoint to check authentication without requiring token
 */
router.get("/debug-auth", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const clerkSecretKey = process.env.CLERK_SECRET_KEY ? "Set" : "Not set";
    const clerkPublishableKey = process.env.CLERK_PUBLISHABLE_KEY
      ? "Set"
      : "Not set";

    res.json({
      success: true,
      debug: {
        authHeader: authHeader
          ? authHeader.substring(0, 20) + "..."
          : "Not provided",
        clerkSecretKey,
        clerkPublishableKey,
        nodeEnv: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
      },
      message: "Debug info - check console for detailed errors",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: "DEBUG_ERROR",
        message: error.message,
      },
    });
  }
});

/**
 * GET /api/test/mock-auth
 * Mock authentication endpoint for testing (development only)
 */
router.get("/mock-auth", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({
      success: false,
      error: {
        code: "MOCK_AUTH_NOT_ALLOWED",
        message: "Mock authentication is not allowed in production",
      },
    });
  }

  try {
    // Mock user data for testing
    const mockUser = {
      userId: "mock_user_123",
      sessionId: "mock_session_456",
      supabaseUserId: null,
      isMock: true,
    };

    req.auth = mockUser;

    // Try to sync with Supabase (optional)
    try {
      const { syncUserWithSupabase } = require("../utils/clerkSupabaseSync");
      const supabaseUser = await syncUserWithSupabase(mockUser.userId);
      mockUser.supabaseUserId = supabaseUser?.id;
    } catch (syncError) {
      console.warn("⚠️ Mock auth Supabase sync failed:", syncError.message);
    }

    res.json({
      success: true,
      message: "Mock authentication successful",
      auth: mockUser,
      timestamp: new Date().toISOString(),
      warning: "This is mock authentication for development only",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: "MOCK_AUTH_ERROR",
        message: error.message,
      },
    });
  }
});

/**
 * GET /api/test/token-debug
 * Debug endpoint to test token validation
 */
router.get("/token-debug", clerkAuth, async (req, res) => {
  try {
    res.json({
      success: true,
      message: "Token validation successful",
      auth: {
        userId: req.auth.userId,
        sessionId: req.auth.sessionId,
        isMock: req.auth.isMock,
        tokenExpiry: req.auth.claims?.exp
          ? new Date(req.auth.claims.exp * 1000).toISOString()
          : null,
        currentTime: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: "DEBUG_ERROR",
        message: error.message,
      },
    });
  }
});

module.exports = router;
