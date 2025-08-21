const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = {
  watchFolders: [
    monorepoRoot,
  ],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(monorepoRoot, 'node_modules'),
    ],
    alias: {
      '@': path.resolve(projectRoot, 'src'),
      '@/components': path.resolve(projectRoot, 'src/components'),
      '@/screens': path.resolve(projectRoot, 'src/screens'),
      '@/navigation': path.resolve(projectRoot, 'src/navigation'),
      '@/services': path.resolve(projectRoot, 'src/services'),
      '@/hooks': path.resolve(projectRoot, 'src/hooks'),
      '@/store': path.resolve(projectRoot, 'src/store'),
      '@/utils': path.resolve(projectRoot, 'src/utils'),
      '@/types': path.resolve(projectRoot, 'src/types'),
      '@/constants': path.resolve(projectRoot, 'src/constants'),
    },
    platforms: ['ios', 'android', 'native', 'web'],
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);