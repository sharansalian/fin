// Metro config for monorepo.
//
// WHY this is needed:
//   Metro (the RN bundler) normally only watches the app's own folder.
//   In a monorepo, @pocket/core lives in ../../packages/core.
//   Without this config Metro won't see it and imports will fail.
//
// HOW it works:
//   1. watchFolders — tell Metro to also watch the workspace root
//      so changes to packages/core hot-reload in the dev build.
//   2. nodeModulesPaths — tell Metro where to look for node_modules
//      (both the app's own and the workspace root's).

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot   = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the entire repo so Metro sees packages/core
config.watchFolders = [workspaceRoot];

// Resolve node_modules from both the app folder and the workspace root.
// Order matters: app-level wins over workspace-level (local overrides).
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot,   'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
