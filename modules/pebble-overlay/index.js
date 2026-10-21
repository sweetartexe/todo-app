const { requireOptionalNativeModule } = require('expo-modules-core');

function optional(name) {
  try {
    return requireOptionalNativeModule(name);
  } catch {
    return null;
  }
}

module.exports = {
  getOverlay() {
    return optional('PebbleOverlay');
  },
  getWidgetBridge() {
    return optional('PebbleWidgetBridge');
  },
};
