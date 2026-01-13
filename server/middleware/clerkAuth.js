const { clerkClient } = require("@clerk/clerk-sdk-node");

// Initialize Clerk with environment variables
const clerk = require("@clerk/clerk-sdk-node").Clerk;
if (process.env.CLERK_SECRET_KEY) {
  clerk({ secretKey: process.env.CLERK_SECRET_KEY });
  console.log("✅ Clerk initialized with secret key");
}

/**
 * Middleware to verify Clerk session token and attach user info to request
 * Uses pure Clerk authentication without Supabase sync
 */
const clerkAuth = async (req, res, next) => {
  try {
    // Get authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ No authorization header or invalid format");
      return res.status(401).json({
        success: false,
        error: {
          code: "NO_TOKEN",
          message: "No authorization token provided",
        },
      });
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log("🔍 Verifying token:", token.substring(0, 30) + "...");

    // Verify token with Clerk
    try {
      const verifiedToken = await clerkClient.verifyToken(token);

      console.log("✅ Token verified successfully:", {
        userId: verifiedToken.sub,
        sessionId: verifiedToken.sid,
        exp: verifiedToken.exp,
      });

      // Additional validation to ensure token is not expired
      if (
        !verifiedToken.exp ||
        verifiedToken.exp < Math.floor(Date.now() / 1000)
      ) {
        console.error("❌ Token expired");
        return res.status(401).json({
          success: false,
          error: {
            code: "TOKEN_EXPIRED",
            message: "Token has expired. Please sign in again.",
          },
        });
      }

      // Attach user info to request
      req.auth = {
        userId: verifiedToken.sub,
        sessionId: verifiedToken.sid,
        claims: verifiedToken,
        isMock: false,
      };

      console.log(`✅ Successfully authenticated user: ${verifiedToken.sub}`);
      console.log(
        `🕐 Token expires at: ${new Date(verifiedToken.exp * 1000).toISOString()}`,
      );
      next();
    } catch (tokenError) {
      console.error("❌ Token verification failed:", {
        message: tokenError.message,
        code: tokenError.code,
        stack: tokenError.stack,
      });
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid or expired token. Please sign in again.",
        },
      });
    }
  } catch (error) {
    console.error("❌ Auth middleware error:", {
      message: error.message,
      type: error.name,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    return res.status(401).json({
      success: false,
      error: {
        code: "AUTH_ERROR",
        message: "Authentication error occurred. Please try again.",
      },
    });
  }
};

module.exports = clerkAuth;
