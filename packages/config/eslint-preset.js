// Herbruikbaar ESLint-preset voor de Next.js-apps (apps/web, apps/admin).
// Bouwt voort op de root eslint.config.mjs en voegt Next.js/React-specifieke
// regels toe. Gebruik: `import { nextJsConfig } from "@europmade/config/eslint-preset";`
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import next from "@next/eslint-plugin-next";

export const nextJsConfig = tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["**/.next/**", "**/dist/**", "**/node_modules/**"],
  },
  {
    plugins: {
      "react-hooks": reactHooks,
      "@next/next": next,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...next.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);
