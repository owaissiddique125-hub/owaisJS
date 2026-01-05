const { clerkClient } = require('@clerk/clerk-sdk-node');

/**
 * Middleware to verify Clerk session token and attach user info to request
 * Uses real Clerk authentication for production security
 */
const clerkAuth = async (req, res, next) => {
  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'No authorization token provided'
        }
      });
    }

    // Extract the token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify the token with Clerk
    try {
      const verifiedToken = await clerkClient.verifyToken(token);
      
      // Attach user info to request
      req.auth = {
        userId: verifiedToken.sub,
        sessionId: verifiedToken.sid,
        claims: verifiedToken,
        isMock: false
      };
      
      console.log(`Successfully authenticated user: ${verifiedToken.sub}`);
      next();
    } catch (tokenError) {
      console.error('Token verification failed:', tokenError.message);
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token'
        }
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', {
      message: error.message,
      type: error.name,
      timestamp: new Date().toISOString()
    });
    
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication error occurred.'
      }
    });
  }
};

module.exports = clerkAuth;
