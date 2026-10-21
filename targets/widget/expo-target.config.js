/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'PebbleWidget',
  displayName: 'Pebble',
  deploymentTarget: '17.0',
  bundleIdentifier: '.widget',
  colors: {
    $widgetBackground: '#FFF6EA',
    $accent: '#FF6B4A',
  },
  entitlements: {
    'com.apple.security.application-groups':
      config.ios?.entitlements?.['com.apple.security.application-groups'] ?? ['group.app.pebble.todo'],
  },
});
