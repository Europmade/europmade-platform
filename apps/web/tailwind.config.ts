import type { Config } from "tailwindcss";
import { europmadePreset } from "@europmade/config/tailwind-preset";

const config: Config = {
  presets: [europmadePreset as Config],
  content: [
    "./app/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
    // Class strings such as aspect-[2.4/1] live in shared constants.
    "../../packages/utils/src/**/*.{ts,tsx}",
  ],
};

export default config;
