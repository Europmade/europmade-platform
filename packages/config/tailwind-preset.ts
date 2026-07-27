// Gedeeld Tailwind-preset voor alle EuropMade-apps.
//
// BELANGRIJK: dit preset introduceert geen nieuwe designkeuzes. Elke waarde hieronder
// is direct overgenomen uit het al bestaande, structureel bevestigde Design System:
//   - Grijswaarden-schaal (--wf-100 t/m --wf-900): letterlijk dezelfde hexwaarden die
//     in alle bevroren wireframes (Sprint 1A/1B/1C) worden gebruikt.
//   - Spacing-schaal: docs/07-design-system/spacing.md ("4px-basis, consistent
//     toegepast in alle wireframes: 4·8·12·16·24·32·48·64px").
//   - Breakpoints: docs/07-design-system/spacing.md ("Mobiel ~390px, Tablet ~834px,
//     Desktop ~1080–1160px").
//   - Font-stack: exact de --wf-font-stack uit elk wireframe-bestand.
//
// Merkkleuren (color-primary, color-verified, color-buybox-winner, etc.) staan in
// docs/07-design-system/colors.md nog als "t.b.d." — die zijn hier bewust NIET
// ingevuld. Zodra de merk-/kleurfase is afgerond, wordt uitsluitend dit bestand
// bijgewerkt; geen enkele losse app-config hoeft dan te wijzigen.
import type { Config } from "tailwindcss";

export const europmadePreset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        // Grijswaarden-schaal — 1-op-1 uit de bevroren wireframes (--wf-100 .. --wf-900)
        wf: {
          100: "#f2f2f2",
          200: "#e4e4e4",
          300: "#cccccc",
          400: "#a8a8a8",
          500: "#8a8a8a",
          600: "#666666",
          700: "#4a4a4a",
          800: "#2c2c2c",
          900: "#151515",
        },
      },
      spacing: {
        // Bevestigde 4px-basisschaal, docs/07-design-system/spacing.md
        1: "4px",
        2: "8px",
        3: "12px",
        4: "16px",
        6: "24px",
        8: "32px",
        12: "48px",
        16: "64px",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Arial",
          "sans-serif",
        ],
      },
      screens: {
        // Bevestigde breakpoints, docs/07-design-system/spacing.md
        mobile: "390px",
        tablet: "834px",
        desktop: "1080px",
      },
      borderRadius: {
        // Consistent met de wireframe-componenten (CMP-005 Button, CMP-010 Table, e.a.)
        wf: "5px",
      },
    },
  },
};

export default europmadePreset;
