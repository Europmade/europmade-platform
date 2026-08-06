/**
 * Seller Dashboard MVP — realistische demo-data voor beoordeling van schermen.
 * Nederlandse namen, geloofwaardige bedragen, actieve verkoper (enkele maanden).
 */

export type ProductCloudStatus =
  | "Gekoppeld"
  | "Wacht op producent"
  | "In beoordeling"
  | "Conflict"
  | "Niet gekoppeld"

export type DemoProduct = {
  id: string
  title: string
  ean: string
  lifecycle_status: string
  listing: "live" | "concept"
  stock: number | null
  price: number | null
  category: string
  product_cloud_status: ProductCloudStatus
}

export type DemoOrder = {
  id: string
  order_number: string
  created_at: string
  payment_status: string
  total: number
  customer_name: string
}

export type DemoMessage = {
  id: string
  order_number: string
  customer_name: string
  subject: string
  preview: string
  unread: boolean
  updated_at: string
}

export type DemoReturn = {
  id: string
  order_number: string
  status: string
  reason: string
  created_at: string
  amount: number
}

export type DemoReview = {
  id: string
  score: number
  text: string
  product_title: string
  created_at: string
  answered: boolean
  reply?: string
}

export type DemoAffiliate = {
  id: string
  name: string
  status: "Actief" | "Gepauzeerd" | "In behandeling"
  sales_count: number
  sales_amount: number
  commission_paid: number
  commission_open: number
}

export type DemoBannerCampaign = {
  id: string
  name: string
  status: "Concept" | "Gepland" | "Actief" | "Afgerond" | "Gepauzeerd"
  location: "homepage" | "category" | "search" | "product"
  starts_at: string
  ends_at: string
  cost: number
  invoice_status: "Nog te factureren" | "Gefactureerd" | "Betaald"
}

export type DemoMarketingInvoice = {
  id: string
  type: "banner_campaigns" | "affiliate_commissions" | "premium_options"
  description: string
  amount: number
  status: "Nog te factureren" | "Gefactureerd" | "Betaald"
  period_key: string
}

export type DemoPayout = {
  id: string
  amount: number
  status: "Gepland" | "In behandeling" | "Uitbetaald"
  eligible_at: string
}

export type DemoRevenuePoint = {
  month: string
  revenue: number
}

export const BANNER_WEEKLY_PRICES: Record<
  "homepage" | "category" | "search" | "product",
  number
> = {
  homepage: 995,
  category: 395,
  search: 149,
  product: 69,
}

export const BANNER_POSITION_LABELS: Record<
  "homepage" | "category" | "search" | "product",
  string
> = {
  homepage: "Homepage Hero",
  category: "Categoriepagina",
  search: "Zoekresultaat",
  product: "Productpagina",
}

/** Bereken aantal weken (minimaal 1) tussen twee datums. */
export function bannerWeeksBetween(startsAt: string, endsAt: string): number {
  if (!startsAt || !endsAt) return 0
  const start = new Date(startsAt)
  const end = new Date(endsAt)
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
    return 0
  }
  if (end <= start) return 0
  const ms = end.getTime() - start.getTime()
  const weeks = Math.ceil(ms / (7 * 24 * 60 * 60 * 1000))
  return Math.max(1, weeks)
}

export function bannerTotalPrice(
  location: keyof typeof BANNER_WEEKLY_PRICES,
  startsAt: string,
  endsAt: string
): number | null {
  const weeks = bannerWeeksBetween(startsAt, endsAt)
  if (weeks <= 0) return null
  return weeks * BANNER_WEEKLY_PRICES[location]
}

export const DEMO_PRODUCTS: DemoProduct[] = [
  {
    id: "prod_01",
    title: "Noordzee Olijfolie Extra Vierge 500 ml",
    ean: "8712345678901",
    lifecycle_status: "Actief",
    listing: "live",
    stock: 142,
    price: 12.95,
    category: "Voeding > Oliën",
    product_cloud_status: "Gekoppeld",
  },
  {
    id: "prod_02",
    title: "Limburgse Stroopwafels Bio 8-pack",
    ean: "8712345678902",
    lifecycle_status: "Actief",
    listing: "live",
    stock: 86,
    price: 4.49,
    category: "Voeding > Snacks",
    product_cloud_status: "Gekoppeld",
  },
  {
    id: "prod_03",
    title: "Brabantse Kaasplank Eiken 40 cm",
    ean: "8712345678903",
    lifecycle_status: "Actief",
    listing: "live",
    stock: 23,
    price: 34.9,
    category: "Wonen > Keuken",
    product_cloud_status: "Gekoppeld",
  },
  {
    id: "prod_04",
    title: "Amsterdamse Fietsbel Messing",
    ean: "8712345678904",
    lifecycle_status: "Actief",
    listing: "live",
    stock: 210,
    price: 9.95,
    category: "Sport > Fiets",
    product_cloud_status: "Gekoppeld",
  },
  {
    id: "prod_05",
    title: "Friese Wolvilt Sloffen Maat 42",
    ean: "8712345678905",
    lifecycle_status: "Actief",
    listing: "live",
    stock: 54,
    price: 49.0,
    category: "Mode > Schoenen",
    product_cloud_status: "Gekoppeld",
  },
  {
    id: "prod_06",
    title: "Zeeuwse Mosselpan Gietijzer 28 cm",
    ean: "8712345678906",
    lifecycle_status: "Actief",
    listing: "live",
    stock: 31,
    price: 79.0,
    category: "Wonen > Koken",
    product_cloud_status: "Gekoppeld",
  },
  {
    id: "prod_07",
    title: "Utrechtse Keramiek Mok Set (4)",
    ean: "8712345678907",
    lifecycle_status: "Actief",
    listing: "live",
    stock: 67,
    price: 29.95,
    category: "Wonen > Servies",
    product_cloud_status: "Gekoppeld",
  },
  {
    id: "prod_08",
    title: "Groninger Mosterd Pikant 200 g",
    ean: "8712345678908",
    lifecycle_status: "Actief",
    listing: "live",
    stock: 178,
    price: 3.75,
    category: "Voeding > Sauzen",
    product_cloud_status: "Gekoppeld",
  },
  {
    id: "prod_09",
    title: "Twentse Linnen Theedoek Set",
    ean: "8712345678909",
    lifecycle_status: "Actief",
    listing: "live",
    stock: 92,
    price: 18.5,
    category: "Wonen > Textiel",
    product_cloud_status: "Gekoppeld",
  },
  {
    id: "prod_10",
    title: "Drentse Honing Bloemen 350 g",
    ean: "8712345678910",
    lifecycle_status: "Actief",
    listing: "live",
    stock: 0,
    price: 8.95,
    category: "Voeding > Zoetwaren",
    product_cloud_status: "Gekoppeld",
  },
  {
    id: "prod_11",
    title: "Hollandse Kaasrasp RVS Premium",
    ean: "8712345678911",
    lifecycle_status: "Actief",
    listing: "live",
    stock: 115,
    price: 14.95,
    category: "Wonen > Keuken",
    product_cloud_status: "Gekoppeld",
  },
  {
    id: "prod_12",
    title: "Rotterdamse Havenlicht LED",
    ean: "8712345678912",
    lifecycle_status: "Actief",
    listing: "live",
    stock: 41,
    price: 59.0,
    category: "Wonen > Verlichting",
    product_cloud_status: "Gekoppeld",
  },
  {
    id: "prod_13",
    title: "Gelderse Appelstroop Ambachtelijk",
    ean: "8712345678913",
    lifecycle_status: "Actief",
    listing: "live",
    stock: 133,
    price: 5.25,
    category: "Voeding > Zoetwaren",
    product_cloud_status: "Gekoppeld",
  },
  {
    id: "prod_14",
    title: "Haagse Drop Klassiek 250 g",
    ean: "8712345678914",
    lifecycle_status: "Actief",
    listing: "live",
    stock: 201,
    price: 2.99,
    category: "Voeding > Snacks",
    product_cloud_status: "Gekoppeld",
  },
  {
    id: "prod_15",
    title: "Overijsselse Woldeken 140×200",
    ean: "8712345678915",
    lifecycle_status: "Actief",
    listing: "live",
    stock: 18,
    price: 89.0,
    category: "Wonen > Textiel",
    product_cloud_status: "Gekoppeld",
  },
  {
    id: "prod_16",
    title: "Flevolandse Aspergepan 24 cm",
    ean: "8712345678916",
    lifecycle_status: "Concept gecontroleerd",
    listing: "concept",
    stock: null,
    price: 44.5,
    category: "Wonen > Koken",
    product_cloud_status: "In beoordeling",
  },
  {
    id: "prod_17",
    title: "Zaanse Windmolen Miniatuur",
    ean: "8712345678917",
    lifecycle_status: "Retailer Created",
    listing: "concept",
    stock: null,
    price: 24.95,
    category: "Cadeau > Decoratie",
    product_cloud_status: "Wacht op producent",
  },
  {
    id: "prod_18",
    title: "Delfts Blauw Onderzetter Set",
    ean: "8712345678918",
    lifecycle_status: "Concept gecontroleerd",
    listing: "concept",
    stock: 12,
    price: 16.5,
    category: "Wonen > Decoratie",
    product_cloud_status: "Conflict",
  },
  {
    id: "prod_19",
    title: "Noord-Hollandse Kaasboor",
    ean: "8712345678919",
    lifecycle_status: "Retailer Created",
    listing: "concept",
    stock: null,
    price: 11.95,
    category: "Wonen > Keuken",
    product_cloud_status: "Niet gekoppeld",
  },
  {
    id: "prod_20",
    title: "Zeeuwse Speculaas Broodjes",
    ean: "8712345678920",
    lifecycle_status: "Actief",
    listing: "live",
    stock: 74,
    price: 6.49,
    category: "Voeding > Bakkerij",
    product_cloud_status: "Gekoppeld",
  },
  {
    id: "prod_21",
    title: "Limburgse Vilt Tas Shopper",
    ean: "8712345678921",
    lifecycle_status: "Actief",
    listing: "live",
    stock: 48,
    price: 32.0,
    category: "Mode > Tassen",
    product_cloud_status: "Gekoppeld",
  },
  {
    id: "prod_22",
    title: "Brabantse Bierglas Set (6)",
    ean: "8712345678922",
    lifecycle_status: "Actief",
    listing: "live",
    stock: 29,
    price: 39.95,
    category: "Wonen > Servies",
    product_cloud_status: "Gekoppeld",
  },
  {
    id: "prod_23",
    title: "Friese Theeblend Bergamot",
    ean: "8712345678923",
    lifecycle_status: "Concept gecontroleerd",
    listing: "concept",
    stock: null,
    price: 7.5,
    category: "Voeding > Dranken",
    product_cloud_status: "In beoordeling",
  },
  {
    id: "prod_24",
    title: "Utrechtse Bamboe Snijplank",
    ean: "8712345678924",
    lifecycle_status: "Actief",
    listing: "live",
    stock: 61,
    price: 22.0,
    category: "Wonen > Keuken",
    product_cloud_status: "Gekoppeld",
  },
  {
    id: "prod_25",
    title: "Amsterdamse Fietslicht Set USB",
    ean: "8712345678925",
    lifecycle_status: "Actief",
    listing: "live",
    stock: 95,
    price: 27.5,
    category: "Sport > Fiets",
    product_cloud_status: "Gekoppeld",
  },
]

export const DEMO_ORDERS: DemoOrder[] = [
  {
    id: "ord_01",
    order_number: "EM-2026-10482",
    created_at: "2026-08-04T14:22:00Z",
    payment_status: "Betaald",
    total: 87.4,
    customer_name: "Sanne de Vries",
  },
  {
    id: "ord_02",
    order_number: "EM-2026-10471",
    created_at: "2026-08-03T09:11:00Z",
    payment_status: "Betaald",
    total: 124.85,
    customer_name: "Mark Janssen",
  },
  {
    id: "ord_03",
    order_number: "EM-2026-10455",
    created_at: "2026-08-02T16:40:00Z",
    payment_status: "Betaling wordt verwerkt",
    total: 49.0,
    customer_name: "Lisa Bakker",
  },
  {
    id: "ord_04",
    order_number: "EM-2026-10432",
    created_at: "2026-07-30T11:05:00Z",
    payment_status: "Betaald",
    total: 212.3,
    customer_name: "Tom Vermeer",
  },
  {
    id: "ord_05",
    order_number: "EM-2026-10418",
    created_at: "2026-07-28T18:20:00Z",
    payment_status: "Betaald",
    total: 63.75,
    customer_name: "Emma Visser",
  },
  {
    id: "ord_06",
    order_number: "EM-2026-10397",
    created_at: "2026-07-25T08:44:00Z",
    payment_status: "Betaald",
    total: 158.9,
    customer_name: "Joris Meijer",
  },
  {
    id: "ord_07",
    order_number: "EM-2026-10381",
    created_at: "2026-07-22T13:15:00Z",
    payment_status: "Betaald",
    total: 34.9,
    customer_name: "Nina Kuiper",
  },
  {
    id: "ord_08",
    order_number: "EM-2026-10364",
    created_at: "2026-07-18T10:02:00Z",
    payment_status: "Betaald",
    total: 99.45,
    customer_name: "Peter Smit",
  },
  {
    id: "ord_09",
    order_number: "EM-2026-10341",
    created_at: "2026-07-14T15:33:00Z",
    payment_status: "Betaald",
    total: 76.2,
    customer_name: "Anouk Hendriks",
  },
  {
    id: "ord_10",
    order_number: "EM-2026-10322",
    created_at: "2026-07-10T09:27:00Z",
    payment_status: "Betaald",
    total: 145.0,
    customer_name: "Bas Willems",
  },
  {
    id: "ord_11",
    order_number: "EM-2026-10298",
    created_at: "2026-07-05T12:50:00Z",
    payment_status: "Betaald",
    total: 28.4,
    customer_name: "Fleur Dijkstra",
  },
  {
    id: "ord_12",
    order_number: "EM-2026-10271",
    created_at: "2026-06-28T17:08:00Z",
    payment_status: "Betaald",
    total: 189.6,
    customer_name: "Koen Mulder",
  },
  {
    id: "ord_13",
    order_number: "EM-2026-10244",
    created_at: "2026-06-20T08:19:00Z",
    payment_status: "Betaald",
    total: 54.15,
    customer_name: "Iris de Boer",
  },
  {
    id: "ord_14",
    order_number: "EM-2026-10211",
    created_at: "2026-06-12T14:41:00Z",
    payment_status: "Betaald",
    total: 112.8,
    customer_name: "Daan Peters",
  },
]

export const DEMO_MESSAGES: DemoMessage[] = [
  {
    id: "msg_01",
    order_number: "EM-2026-10482",
    customer_name: "Sanne de Vries",
    subject: "Vraag over levertijd",
    preview: "Kunnen jullie aangeven wanneer dit pakket wordt verzonden?",
    unread: true,
    updated_at: "2026-08-05T07:12:00Z",
  },
  {
    id: "msg_02",
    order_number: "EM-2026-10471",
    customer_name: "Mark Janssen",
    subject: "Beschadigde verpakking",
    preview: "De doos was licht beschadigd, product zelf lijkt intact.",
    unread: true,
    updated_at: "2026-08-04T19:40:00Z",
  },
  {
    id: "msg_03",
    order_number: "EM-2026-10432",
    customer_name: "Tom Vermeer",
    subject: "Factuuradres wijzigen",
    preview: "Is het mogelijk het factuuradres nog aan te passen?",
    unread: true,
    updated_at: "2026-08-03T11:05:00Z",
  },
  {
    id: "msg_04",
    order_number: "EM-2026-10397",
    customer_name: "Joris Meijer",
    subject: "Bedankt voor snelle levering",
    preview: "Alles netjes aangekomen, top service!",
    unread: false,
    updated_at: "2026-07-26T09:20:00Z",
  },
  {
    id: "msg_05",
    order_number: "EM-2026-10381",
    customer_name: "Nina Kuiper",
    subject: "Andere maat mogelijk?",
    preview: "Hebben jullie de sloffen ook in maat 40?",
    unread: false,
    updated_at: "2026-07-23T16:55:00Z",
  },
  {
    id: "msg_06",
    order_number: "EM-2026-10364",
    customer_name: "Peter Smit",
    subject: "Track & trace",
    preview: "De trackingcode lijkt niet te werken in PostNL.",
    unread: true,
    updated_at: "2026-07-19T08:10:00Z",
  },
  {
    id: "msg_07",
    order_number: "EM-2026-10341",
    customer_name: "Anouk Hendriks",
    subject: "Cadeauverpakking",
    preview: "Kunnen jullie volgende keer cadeaupapier meeleveren?",
    unread: false,
    updated_at: "2026-07-15T12:30:00Z",
  },
  {
    id: "msg_08",
    order_number: "EM-2026-10298",
    customer_name: "Fleur Dijkstra",
    subject: "Allergie-informatie",
    preview: "Bevat de honing sporen van noten?",
    unread: false,
    updated_at: "2026-07-06T10:45:00Z",
  },
]

export const DEMO_RETURNS: DemoReturn[] = [
  {
    id: "ret_01",
    order_number: "EM-2026-10418",
    status: "Aangevraagd",
    reason: "Product voldoet niet aan verwachting",
    created_at: "2026-08-01T10:00:00Z",
    amount: 49.0,
  },
  {
    id: "ret_02",
    order_number: "EM-2026-10364",
    status: "Bevestigd",
    reason: "Verkeerde kleur ontvangen",
    created_at: "2026-07-20T14:22:00Z",
    amount: 18.5,
  },
  {
    id: "ret_03",
    order_number: "EM-2026-10271",
    status: "Ontvangen",
    reason: "Defect bij aankomst",
    created_at: "2026-07-02T09:15:00Z",
    amount: 59.0,
  },
]

export const DEMO_REVIEWS: DemoReview[] = [
  {
    id: "rev_01",
    score: 5,
    text: "Prachtige kwaliteit olijfolie, smaakt echt naar Italie — maar dan uit Europa.",
    product_title: "Noordzee Olijfolie Extra Vierge 500 ml",
    created_at: "2026-08-02T12:00:00Z",
    answered: false,
  },
  {
    id: "rev_02",
    score: 4,
    text: "Lekkere stroopwafels, verpakking was iets geplet.",
    product_title: "Limburgse Stroopwafels Bio 8-pack",
    created_at: "2026-07-29T16:20:00Z",
    answered: true,
    reply: "Bedankt voor je feedback — we verbeteren de verpakking.",
  },
  {
    id: "rev_03",
    score: 5,
    text: "Kaasplank is stevig en mooi afgewerkt. Aanrader!",
    product_title: "Brabantse Kaasplank Eiken 40 cm",
    created_at: "2026-07-25T09:40:00Z",
    answered: false,
  },
  {
    id: "rev_04",
    score: 3,
    text: "Fietsbel klinkt goed, maar de montage was lastig.",
    product_title: "Amsterdamse Fietsbel Messing",
    created_at: "2026-07-21T18:05:00Z",
    answered: false,
  },
  {
    id: "rev_05",
    score: 2,
    text: "Sloffen vielen kleiner uit dan verwacht.",
    product_title: "Friese Wolvilt Sloffen Maat 42",
    created_at: "2026-07-18T11:30:00Z",
    answered: false,
  },
  {
    id: "rev_06",
    score: 5,
    text: "Mosselpan houdt warmte perfect vast.",
    product_title: "Zeeuwse Mosselpan Gietijzer 28 cm",
    created_at: "2026-07-12T14:55:00Z",
    answered: true,
    reply: "Fijn om te horen! Smakelijk.",
  },
  {
    id: "rev_07",
    score: 1,
    text: "Mok set kwam met een barst in één mok aan.",
    product_title: "Utrechtse Keramiek Mok Set (4)",
    created_at: "2026-07-08T08:10:00Z",
    answered: false,
  },
  {
    id: "rev_08",
    score: 4,
    text: "Mosterd is pittig zoals beloofd. Goede prijs.",
    product_title: "Groninger Mosterd Pikant 200 g",
    created_at: "2026-07-04T19:25:00Z",
    answered: false,
  },
  {
    id: "rev_09",
    score: 5,
    text: "Theedoeken voelen stevig en wassen mooi.",
    product_title: "Twentse Linnen Theedoek Set",
    created_at: "2026-06-28T13:00:00Z",
    answered: true,
    reply: "Dankjewel voor de review!",
  },
]

export const DEMO_AFFILIATES: DemoAffiliate[] = [
  {
    id: "aff_01",
    name: "GreenLiving.nl",
    status: "Actief",
    sales_count: 42,
    sales_amount: 3180.5,
    commission_paid: 254.4,
    commission_open: 63.6,
  },
  {
    id: "aff_02",
    name: "Fiets & Meer Blog",
    status: "Actief",
    sales_count: 28,
    sales_amount: 1540.0,
    commission_paid: 123.2,
    commission_open: 30.8,
  },
  {
    id: "aff_03",
    name: "KeukenInspiratie Magazin",
    status: "Gepauzeerd",
    sales_count: 15,
    sales_amount: 980.75,
    commission_paid: 78.46,
    commission_open: 0,
  },
  {
    id: "aff_04",
    name: "Lokaal Lekker Podcast",
    status: "In behandeling",
    sales_count: 0,
    sales_amount: 0,
    commission_paid: 0,
    commission_open: 0,
  },
]

export const DEMO_BANNER_CAMPAIGNS: DemoBannerCampaign[] = [
  {
    id: "ban_01",
    name: "Zomer Hero — Homepage",
    status: "Actief",
    location: "homepage",
    starts_at: "2026-07-21",
    ends_at: "2026-08-18",
    cost: 3980,
    invoice_status: "Gefactureerd",
  },
  {
    id: "ban_02",
    name: "Keuken categorie push",
    status: "Actief",
    location: "category",
    starts_at: "2026-07-28",
    ends_at: "2026-08-11",
    cost: 790,
    invoice_status: "Nog te factureren",
  },
]

export const DEMO_MARKETING_INVOICES: DemoMarketingInvoice[] = [
  {
    id: "minv_01",
    type: "banner_campaigns",
    description: "Homepage Hero — juli/augustus",
    amount: 3980,
    status: "Gefactureerd",
    period_key: "2026-07",
  },
  {
    id: "minv_02",
    type: "banner_campaigns",
    description: "Categoriepagina Keuken — 2 weken",
    amount: 790,
    status: "Nog te factureren",
    period_key: "2026-08",
  },
  {
    id: "minv_03",
    type: "affiliate_commissions",
    description: "Affiliate commissies juli",
    amount: 456.06,
    status: "Betaald",
    period_key: "2026-07",
  },
  {
    id: "minv_04",
    type: "premium_options",
    description: "Uitgelichte winkelbadge Q2",
    amount: 149,
    status: "Betaald",
    period_key: "2026-06",
  },
]

export const DEMO_PAYOUTS: DemoPayout[] = [
  {
    id: "pay_01",
    amount: 2840.5,
    status: "Gepland",
    eligible_at: "2026-08-12",
  },
  {
    id: "pay_02",
    amount: 3125.75,
    status: "Uitbetaald",
    eligible_at: "2026-07-15",
  },
  {
    id: "pay_03",
    amount: 2678.2,
    status: "Uitbetaald",
    eligible_at: "2026-06-15",
  },
]

export const DEMO_REVENUE_HISTORY: DemoRevenuePoint[] = [
  { month: "2026-03", revenue: 8420.5 },
  { month: "2026-04", revenue: 9155.0 },
  { month: "2026-05", revenue: 10240.75 },
  { month: "2026-06", revenue: 11890.2 },
  { month: "2026-07", revenue: 13455.8 },
  { month: "2026-08", revenue: 4210.35 },
]

export const DEMO_FINANCE = {
  available_balance: 2840.5,
  next_payout_amount: 2840.5,
  next_payout_date: "2026-08-12",
  open_commissions: 312.4,
  marketing_costs: 4770,
  net_revenue_month: 4210.35,
  open_invoices: 2,
}

export const DEMO_DASHBOARD_ACTIONS = {
  new_messages: 4,
  products_awaiting_approval: 3,
  open_returns: 3,
  open_invoices: 2,
  banner_expiring_soon: 1,
}

export const DEMO_AFFILIATE_SETTINGS = {
  default_commission_percent: 8,
  category_commissions: [
    {
      category_id: "cat_voeding",
      category_name: "Voeding",
      commission_percent: 6,
    },
    {
      category_id: "cat_wonen",
      category_name: "Wonen",
      commission_percent: 10,
    },
  ],
  product_commissions: [
    {
      product_id: "prod_01",
      product_title: "Noordzee Olijfolie Extra Vierge 500 ml",
      commission_percent: 12,
    },
    {
      product_id: "prod_06",
      product_title: "Zeeuwse Mosselpan Gietijzer 28 cm",
      commission_percent: 9,
    },
  ],
}

export const DEMO_COMPANY = {
  legal_name: "Noordzee Ambacht BV",
  chamber_of_commerce_number: "64128390",
  country_code: "NL",
  vat_number: "NL864128390B01",
  iban: "NL91ABNA0417164300",
  return_address: "Industrieweg 14, 1822 BV Alkmaar",
  shipping_address: "Havenkade 8, 1823 CE Alkmaar",
}
