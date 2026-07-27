import type { Config } from "tailwindcss";
import { europmadePreset } from "@europmade/config/tailwind-preset";

const config: Config = {
  presets: [europmadePreset as Config],
  content: [
    "./app/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
};

export default config;
