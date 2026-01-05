const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Exclude backend files and server-side packages from bundling
const backendPath = path.resolve(__dirname, 'server');

config.resolver.blockList = [
  // Block backend directory
  new RegExp(`^${backendPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
  // Block server-side only packages
  /node_modules\/express\//,
  /node_modules\/cors\//,
  /node_modules\/helmet\//,
  /node_modules\/express-validator\//,
  /node_modules\/express-rate-limit\//,
  /node_modules\/@clerk\/clerk-sdk-node\//,
  /node_modules\/svix\//,
  /node_modules\/cloudinary\//,
  /node_modules\/multer\//,
];

// Also exclude from watch list
config.watchFolders = [
  ...config.watchFolders || [],
];

module.exports = config;
