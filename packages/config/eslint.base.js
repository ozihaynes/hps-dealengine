module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended', // Uses the recommended rules from @typescript-eslint/eslint-plugin
    'plugin:prettier/recommended', // Enables eslint-plugin-prettier and displays prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
  ],
  parser: '@typescript-eslint/parser', // Specifies the ESLint parser
  parserOptions: {
    ecmaVersion: 'latest', // Allows for the parsing of modern ECMAScript features
    sourceType: 'module', // Allows for the use of imports
  },
  plugins: ['@typescript-eslint', 'prettier'],
  rules: {
    'prettier/prettier': 'warn', // Show Prettier issues as warnings
    '@typescript-eslint/no-unused-vars': 'warn', // Warn about unused variables
    '@typescript-eslint/no-explicit-any': 'warn', // Warn about using 'any' type
    // Add any other specific rules you want to enforce project-wide here
  },
  ignorePatterns: ['node_modules/', 'dist/', '.next/', 'out/'], // Ignore these folders
};