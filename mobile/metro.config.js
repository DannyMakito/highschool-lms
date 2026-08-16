const { getDefaultConfig } = require('expo/metro-config');
const { withNativewind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// parent-mobile is being hosted by this Expo application. Watch its source,
// but always resolve React/React Native dependencies from this app so Metro
// does not bundle a second runtime from parent-mobile/node_modules.
config.watchFolders = [path.resolve(__dirname, '../parent-mobile')];
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];
config.resolver.disableHierarchicalLookup = true;

module.exports = withNativewind(config, { inlineRem: 16 });
