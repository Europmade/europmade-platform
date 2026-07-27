# packages/

Bevat de gedeelde code tussen `apps/web` en `apps/admin`:

- `ui/` — gedeelde componentbibliotheek (shadcn/ui-gebaseerd). Bevat uitsluitend het bestaande Design System (bijv. CMP-005 Button) — geen nieuwe designkeuzes.
- `config/` — gedeelde tsconfig-, ESLint- en Tailwind-presets. Het Tailwind-preset vertaalt exact de al bevestigde Design System-tokens (grijswaarden-schaal, spacing-schaal, breakpoints, font-stack) — geen nieuwe merkkeuzes; kleuren staan in `../docs/07-design-system/colors.md` nog als "t.b.d." en zijn hier bewust niet ingevuld.
- `types/` — gedeelde, generieke TypeScript-types. Bevat nog geen domeintypes (Product, Offer, Partner, e.d.) — die volgen zodra de bijbehorende businesslogica wordt gebouwd, conform de bevroren specificaties in `../docs/03-functional-specs/`.
- `utils/` — gedeelde utility-functies (o.a. de `cn()`-classnames-helper voor shadcn/ui).

Zie `../docs/01-architecture/tech-stack.md` voor de volledige technische context.
