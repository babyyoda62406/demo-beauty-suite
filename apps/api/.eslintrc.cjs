/**
 * ESLint config for apps/api. Extends the shared monorepo config and points the
 * TypeScript parser at this package's tsconfig for type-aware linting.
 */
module.exports = {
  root: true,
  extends: ['@fgd/eslint-config'],
  parserOptions: {
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: ['dist/', 'node_modules/', 'coverage/', '*.config.js', '*.config.cjs'],
};
