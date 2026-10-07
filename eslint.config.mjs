import js from "@eslint/js";

export default [
  {
    ignores: [".next/**", "out/**", "build/**", "node_modules/**", "next-env.d.ts"],
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,mjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        Blob: "readonly",
        console: "readonly",
        crypto: "readonly",
        document: "readonly",
        fetch: "readonly",
        FileReader: "readonly",
        Image: "readonly",
        process: "readonly",
        Response: "readonly",
        URL: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["error", { "varsIgnorePattern": "^[A-Z]" }],
    },
  },
];
