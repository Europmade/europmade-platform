// Root ESLint flat config — gedeelde basisregels voor het hele monorepo.
// Elke app/package breidt dit uit met zijn eigen, specifieke config
// (zie packages/config/eslint-preset.js voor het herbruikbare Next.js-preset).
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      "**/.next/**",
      "**/dist/**",
      "**/.medusa/**",
      "**/node_modules/**",
      "**/.turbo/**",
    ],
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
);
