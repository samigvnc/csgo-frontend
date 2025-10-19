/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: [
    'react-app',
    'react-app/jest',
    // React Hooks kurallarını dahil et
    'plugin:react-hooks/recommended',
  ],
  plugins: ['react', 'react-hooks'],
  rules: {
    // (İstersen seviyesi)
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
};
