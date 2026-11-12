/**
 * Local lifestyle photos for category editorial sections.
 * Product Cloud photos are not a stand-in when a slot has no scene.
 * Text sits on the quiet side of the frame (align), over a navy scrim.
 */

export type CategoryAtmosphereSlot = "hero" | "why" | "know" | "advice"

export type CategoryAtmosphere = {
  src: string
  alt: string
  position: string
  align: "left" | "right"
}

const HOME = "/category/atmosphere/home-living.jpg"
const LAUNDRY_FOLD = "/category/atmosphere/laundry-fold.jpg"
const LAUNDRY_ROOM = "/category/atmosphere/laundry-room.jpg"
const LAUNDRY_HERO = "/category/atmosphere/laundry-hero.jpg"
const HUISHOUDEN_HERO = "/category/atmosphere/huishouden-hero.png"
const EUROPE = "/category/atmosphere/europe-landscape.jpg"
const KITCHEN = "/category/atmosphere/kitchen-builtin.jpg"
const DISHWASHER = "/category/atmosphere/kitchen-dishwasher.jpg"
const DISHWASHER_DETAIL = "/category/atmosphere/dishwasher-detail.jpg"

/**
 * Crop for the short, wide Level 3 hero. Level 2 keeps its own position.
 * A missing scene is left unchanged rather than replaced with a product photo.
 */
const HERO_FOCUS: Record<string, string> = {
  wasmachines: "58% 62%",
  wasdrogers: "center 46%",
  "was-droogcombinaties": "center 52%",
  vaatwassers: "68% 74%",
  "vrijstaande-vaatwassers": "76% 70%",
}

export function categoryHeroFocus(slug: string): string | null {
  return HERO_FOCUS[slug.trim().toLowerCase()] ?? null
}

const SCENE: Record<string, CategoryAtmosphere> = {
  [HOME]: {
    src: HOME,
    alt: "Lichte woonkamer met zitbank, ramen en een eettafel",
    position: "center",
    align: "left",
  },
  [LAUNDRY_FOLD]: {
    src: LAUNDRY_FOLD,
    alt: "Iemand vouwt wasgoed op een tafel in huis",
    position: "center",
    align: "right",
  },
  [LAUNDRY_ROOM]: {
    src: LAUNDRY_ROOM,
    alt: "Iemand sorteert was naast een wasmachine en droger in huis",
    position: "center",
    align: "left",
  },
  [LAUNDRY_HERO]: {
    src: LAUNDRY_HERO,
    alt: "Wasmachine en droger in een lichte wasruimte",
    position: "center",
    align: "left",
  },
  [HUISHOUDEN_HERO]: {
    src: HUISHOUDEN_HERO,
    alt: "Lichte wasruimte met een witte wasmachine, plant en wasmand",
    position: "center 42%",
    align: "left",
  },
  [EUROPE]: {
    src: EUROPE,
    alt: "Bergmeer met naaldbos, gebruikt als sfeerbeeld",
    position: "center",
    align: "left",
  },
  [KITCHEN]: {
    src: KITCHEN,
    alt: "Lichte keuken met inbouwoven, kookplaat en afzuigkap",
    position: "78% center",
    align: "left",
  },
  [DISHWASHER]: {
    src: DISHWASHER,
    alt: "Keuken met een vaatwasser onder het aanrecht",
    position: "88% center",
    align: "left",
  },
  [DISHWASHER_DETAIL]: {
    src: DISHWASHER_DETAIL,
    alt: "Keuken met een volledige inbouwvaatwasser onder het aanrecht",
    position: "68% 74%",
    align: "left",
  },
}

export function categoryAtmosphere(
  slug: string,
  slot: CategoryAtmosphereSlot
): CategoryAtmosphere | null {
  const src = sceneFor(slug, slot)
  return src ? SCENE[src] ?? null : null
}

function sceneFor(slug: string, slot: CategoryAtmosphereSlot): string | null {
  const key = slug.trim().toLowerCase()
  if (key === "huishouden") return slot === "hero" ? HUISHOUDEN_HERO : EUROPE
  if (key === "wasmachines") {
    if (slot === "hero") return HUISHOUDEN_HERO
    if (slot === "advice") return LAUNDRY_ROOM
    return LAUNDRY_FOLD
  }
  if (
    key === "was-droog" ||
    key === "wasdrogers" ||
    key === "was-droogcombinaties" ||
    key === "wasmachines-en-drogers" ||
    key === "vrijstaande-apparaten"
  ) {
    if (slot === "hero") return LAUNDRY_HERO
    if (slot === "advice") return LAUNDRY_ROOM
    return LAUNDRY_FOLD
  }
  if (key === "vaatwassers") return slot === "hero" ? DISHWASHER_DETAIL : DISHWASHER
  if (key.includes("vaatwasser")) return DISHWASHER
  if (
    key === "inbouwapparatuur" ||
    key === "keuken" ||
    key.includes("oven") ||
    key.includes("kook") ||
    key.includes("koel")
  ) {
    if (slot === "hero") return KITCHEN
    return slot === "advice" ? DISHWASHER : KITCHEN
  }
  if (slot === "hero") return HOME
  return null
}
