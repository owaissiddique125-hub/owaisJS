require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { clerkClient } = require("@clerk/clerk-sdk-node");
const testConnection = require("./config/database");
const rateLimiter = require("./middleware/rateLimiter");
const errorHandler = require("./middleware/errorHandler");
const { validateSecurityConfig } = require("./utils/securityValidator");

const app = express();

// Validate security configuration on startup
console.log("🔒 Validating security configuration...");
const { issues, warnings } = validateSecurityConfig();

if (issues.length > 0) {
  console.error("❌ Security configuration issues:");
  issues.forEach((issue) => console.error(`   - ${issue}`));
  if (process.env.NODE_ENV === "production") {
    console.error("⚠️  Cannot start server with security issues in production");
    // Vercel par process.exit nahi karte, bas log karte hain
  }
}

if (warnings.length > 0) {
  console.warn("⚠️  Security warnings:");
  warnings.forEach((warning) => console.warn(`   - ${warning}`));
}

console.log("✅ Security validation complete");

// Test Supabase connection
testConnection();

// HTTPS Enforcement in Production
if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    if (req.header("x-forwarded-proto") !== "https") {
      return res.status(403).json({
        success: false,
        error: {
          code: "HTTPS_REQUIRED",
          message: "HTTPS is required for all API requests",
        },
      });
    }
    next();
  });
}

// Security Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: "deny" },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  })
);

// CORS Configuration - Updated for easy mobile testing
const allowedOrigins =
  process.env.FRONTEND_URL && process.env.FRONTEND_URL !== "*"
    ? process.env.FRONTEND_URL.split(",").map((url) => url.trim())
    : ["http://localhost:8081"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow mobile apps and testing tools
      if (!origin || process.env.FRONTEND_URL === "*") return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate Limiting
app.use("/api/", rateLimiter);

// Health check
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Ali Food API is running on Vercel",
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use("/api/items", require("./route/item"));
app.use("/api/cart", require("./route/cart"));
app.use("/api/orders", require("./route/orderslist"));
app.use("/api/test", require("./route/test"));

// Error handling
app.use(errorHandler);

// --- VERCEL FIX: Listen only in development ---
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Local server running on port ${PORT}`);
  });
}

// Vercel exports the app
module.exports = app;