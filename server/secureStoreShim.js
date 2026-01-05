let SecureStore;
try {
  SecureStore = require('expo-secure-store');
} catch (err) {
  SecureStore = {
    getItemAsync: async () => null,
    setItemAsync: async () => {},
    deleteItemAsync: async () => {},
  };
}
module.exports = SecureStore;
