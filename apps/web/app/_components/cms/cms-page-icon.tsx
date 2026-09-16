import type { SVGProps } from "react"
import {
  IconArrowDown,
  IconCart,
  IconCheck,
  IconCross,
  IconEuro,
  IconFactory,
  IconFile,
  IconGlobe,
  IconMaterials,
  IconPackage,
  IconParts,
  IconSearch,
  IconStar,
  IconStore,
  IconTag,
  IconTranslate,
  IconUsers,
} from "../commercial/commercial-icons"

type IconProps = SVGProps<SVGSVGElement>

const MAP: Record<string, (props: IconProps) => JSX.Element> = {
  factory: IconFactory,
  parts: IconParts,
  materials: IconMaterials,
  search: IconSearch,
  star: IconStar,
  cart: IconCart,
  globe: IconGlobe,
  euro: IconEuro,
  package: IconPackage,
  file: IconFile,
  store: IconStore,
  translate: IconTranslate,
  users: IconUsers,
  tag: IconTag,
  check: IconCheck,
  cross: IconCross,
  arrow_down: IconArrowDown,
}

export function CmsPageIcon({
  name,
  className,
}: {
  name?: string | null
  className?: string
}) {
  if (!name || name === "none" || name === "step_number") return null
  const Icon = MAP[name]
  if (!Icon) return null
  return <Icon className={className} />
}
