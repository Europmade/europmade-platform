"use client"

import {
  heroCtaPreset,
  heroTextPresetColor,
  type HeroCtaStyle,
  type HeroTextStyle,
} from "@europmade/utils"

const fieldClass =
  "mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-sm"

function pickerValue(color: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#151515"
}

export function CmsHeroTextStyleField(props: {
  label: string
  role: "title" | "subtitle"
  value: HeroTextStyle
  onChange: (next: HeroTextStyle) => void
}) {
  const { label, role, value, onChange } = props
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold">
        {label}
        <select
          className={fieldClass}
          value={value.preset}
          onChange={(e) => {
            const preset = e.target.value
            if (preset === "white" || preset === "black") {
              onChange({
                preset,
                color: heroTextPresetColor(preset, role),
              })
              return
            }
            onChange({ preset: "custom", color: value.color })
          }}
        >
          <option value="white">Wit</option>
          <option value="black">Zwart</option>
          <option value="custom">Eigen kleur</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm font-semibold">
        Kleurkiezer
        <input
          type="color"
          aria-label={`${label} kleurkiezer`}
          className="h-9 w-14 cursor-pointer rounded border border-wf-400 bg-white p-1"
          value={pickerValue(value.color)}
          onChange={(e) =>
            onChange({ preset: "custom", color: e.target.value })
          }
        />
        <span className="font-mono text-xs font-normal text-wf-600">
          {value.color}
        </span>
      </label>
    </div>
  )
}

export function CmsHeroCtaStyleFields(props: {
  value: HeroCtaStyle
  onChange: (next: HeroCtaStyle) => void
}) {
  const { value, onChange } = props

  function patch(partial: Partial<HeroCtaStyle>) {
    onChange({ ...value, ...partial, preset: "custom" })
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold">
        Stijl
        <select
          className={fieldClass}
          value={value.preset}
          onChange={(e) => {
            const preset = e.target.value
            if (
              preset === "white" ||
              preset === "transparent" ||
              preset === "black"
            ) {
              onChange(heroCtaPreset(preset))
              return
            }
            onChange({ ...value, preset: "custom" })
          }}
        >
          <option value="white">Wit — witte achtergrond, blauwe tekst</option>
          <option value="transparent">
            Transparant — witte tekst en omlijning
          </option>
          <option value="black">Zwart — zwarte achtergrond, witte tekst</option>
          <option value="custom">Aangepast</option>
        </select>
      </label>
      <div className="grid gap-2 tablet:grid-cols-2">
        <label className="block text-sm font-semibold">
          Achtergrondkleur
          <input
            type="color"
            aria-label="Achtergrondkleur"
            className="mt-1 h-9 w-full cursor-pointer rounded border border-wf-400 bg-white p-1"
            value={value.transparent ? "#ffffff" : pickerValue(value.background)}
            disabled={value.transparent}
            onChange={(e) => patch({ background: e.target.value, transparent: false })}
          />
        </label>
        <label className="block text-sm font-semibold">
          Tekstkleur
          <input
            type="color"
            aria-label="Knoptekstkleur"
            className="mt-1 h-9 w-full cursor-pointer rounded border border-wf-400 bg-white p-1"
            value={pickerValue(value.text)}
            onChange={(e) => patch({ text: e.target.value })}
          />
        </label>
        <label className="block text-sm font-semibold">
          Randkleur
          <input
            type="color"
            aria-label="Randkleur"
            className="mt-1 h-9 w-full cursor-pointer rounded border border-wf-400 bg-white p-1"
            value={pickerValue(value.border)}
            onChange={(e) => patch({ border: e.target.value })}
          />
        </label>
        <label className="block text-sm font-semibold">
          Randdikte (px)
          <input
            type="number"
            min={0}
            max={8}
            className={fieldClass}
            value={value.borderWidth}
            onChange={(e) => patch({ borderWidth: Number(e.target.value) })}
          />
        </label>
        <label className="block text-sm font-semibold">
          Hoekafronding (px)
          <input
            type="number"
            min={0}
            max={32}
            className={fieldClass}
            value={value.radius}
            onChange={(e) => patch({ radius: Number(e.target.value) })}
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-wf-800">
        <input
          type="checkbox"
          checked={value.transparent}
          onChange={(e) =>
            patch({
              transparent: e.target.checked,
              background: e.target.checked ? "transparent" : pickerValue(value.background),
            })
          }
        />
        Transparante achtergrond
      </label>
    </div>
  )
}
