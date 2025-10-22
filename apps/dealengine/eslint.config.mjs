{
  "root": true, // Important: Prevents ESLint from looking further up the directory tree
  "extends": [
    "../../packages/config/eslint.base.js", // Extend our shared config
    "next/core-web-vitals" // Next.js specific rules
  ],
  "rules": {
    // You can add rules specific to the dealengine app here if needed
     "@typescript-eslint/no-unused-vars": "off" // TEMPORARY: Turn off during initial setup
  }
}