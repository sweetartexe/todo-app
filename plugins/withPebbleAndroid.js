const { withAndroidManifest } = require('expo/config-plugins');

const PERMISSIONS = [
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
  'android.permission.POST_NOTIFICATIONS',
];

function withPebbleAndroid(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const current = manifest.manifest['uses-permission'] ?? [];
    for (const name of PERMISSIONS) {
      const exists = current.some((item) => item.$['android:name'] === name);
      if (!exists) current.push({ $: { 'android:name': name } });
    }
    manifest.manifest['uses-permission'] = current;
    return config;
  });
}

module.exports = withPebbleAndroid;
