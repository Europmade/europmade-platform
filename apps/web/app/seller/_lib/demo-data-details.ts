/**
 * Uitgebreide demo-details voor order/bericht/retour/sponsored (Seller MVP).
 */

import type { DemoProduct } from "./demo-data"
import { DEMO_ORDERS, DEMO_PRODUCTS } from "./demo-data"

export type DemoOrderLine = {
  product_id: string
  product_name: string
  sku: string
  quantity: number
  unit_price: number
  image_color: string
}

export type DemoOrderDetail = {
  id: string
  order_number: string
  created_at: string
  status: string
  payment_status: string
  shipping_status: string
  customer: {
    name: string
    email: string
    phone: string
  }
  billing_address: string
  shipping_address: string
  lines: DemoOrderLine[]
  subtotal: number
  shipping_cost: number
  vat: number
  total: number
  carrier: string
  tracking_code: string | null
  message_ids: string[]
  return_ids: string[]
  invoice_uploaded: boolean
  packing_slip_available: boolean
}

export type DemoMessageBubble = {
  id: string
  sender: "customer" | "seller"
  body: string
  created_at: string
  attachment_name?: string
}

export type DemoMessageThread = {
  id: string
  order_id: string | null
  order_number: string | null
  return_id: string | null
  customer_name: string
  customer_email: string
  subject: string
  unread: boolean
  updated_at: string
  messages: DemoMessageBubble[]
}

export type DemoReturnDetail = {
  id: string
  return_number: string
  order_id: string
  order_number: string
  customer_name: string
  customer_email: string
  status: string
  reason: string
  comments: string
  created_at: string
  amount: number
  products: Array<{
    product_name: string
    sku: string
    quantity: number
    unit_price: number
  }>
  photo_labels: string[]
  message_id: string | null
}

export type DemoSponsoredCampaign = {
  id: string
  name: string
  product_ids: string[]
  product_titles: string[]
  cpc: number
  daily_budget: number
  starts_at: string
  ends_at: string
  status: "Concept" | "Actief" | "Gepauzeerd" | "Beëindigd"
  clicks: number
  spend: number
  conversions: number
}

export type DemoSellerInvoice = {
  id: string
  order_number: string
  file_name: string
  uploaded_at: string
  amount: number
  status: "Gekoppeld" | "In behandeling"
}

function lineFromProduct(
  product: DemoProduct,
  qty: number,
  color: string
): DemoOrderLine {
  const price = product.price ?? 0
  return {
    product_id: product.id,
    product_name: product.title,
    sku: product.ean,
    quantity: qty,
    unit_price: price,
    image_color: color,
  }
}

function money(n: number) {
  return Math.round(n * 100) / 100
}

function buildDetail(
  orderId: string,
  extras: Partial<DemoOrderDetail> & {
    lines: DemoOrderLine[]
    customer: DemoOrderDetail["customer"]
  }
): DemoOrderDetail {
  const base = DEMO_ORDERS.find((o) => o.id === orderId)!
  const subtotal = money(
    extras.lines.reduce((s, l) => s + l.unit_price * l.quantity, 0)
  )
  const shipping = extras.shipping_cost ?? 4.95
  const vat = money((subtotal + shipping) * 0.21)
  const total = money(subtotal + shipping + vat)
  return {
    id: base.id,
    order_number: base.order_number,
    created_at: base.created_at,
    status: extras.status ?? "In behandeling",
    payment_status: base.payment_status,
    shipping_status: extras.shipping_status ?? "Nog niet verzonden",
    customer: extras.customer,
    billing_address:
      extras.billing_address ??
      `${extras.customer.name}\nKeizersgracht 12\n1015 CN Amsterdam`,
    shipping_address:
      extras.shipping_address ??
      `${extras.customer.name}\nKeizersgracht 12\n1015 CN Amsterdam`,
    lines: extras.lines,
    subtotal,
    shipping_cost: shipping,
    vat,
    total: extras.total ?? total,
    carrier: extras.carrier ?? "PostNL",
    tracking_code: extras.tracking_code ?? null,
    message_ids: extras.message_ids ?? [],
    return_ids: extras.return_ids ?? [],
    invoice_uploaded: extras.invoice_uploaded ?? false,
    packing_slip_available: true,
  }
}

const p = (id: string) => DEMO_PRODUCTS.find((x) => x.id === id)!

export const DEMO_ORDER_DETAILS: DemoOrderDetail[] = DEMO_ORDERS.map(
  (order, index) => {
    const customers = [
      {
        name: "Sanne de Vries",
        email: "sanne.devries@email.nl",
        phone: "+31 6 1234 5678",
      },
      {
        name: "Mark Janssen",
        email: "mark.janssen@email.nl",
        phone: "+31 6 2345 6789",
      },
      {
        name: "Lisa Bakker",
        email: "lisa.bakker@email.nl",
        phone: "+31 6 3456 7890",
      },
      {
        name: "Tom Vermeer",
        email: "tom.vermeer@email.nl",
        phone: "+31 6 4567 8901",
      },
      {
        name: "Emma Visser",
        email: "emma.visser@email.nl",
        phone: "+31 6 5678 9012",
      },
      {
        name: "Joris Meijer",
        email: "joris.meijer@email.nl",
        phone: "+31 6 6789 0123",
      },
      {
        name: "Nina Kuiper",
        email: "nina.kuiper@email.nl",
        phone: "+31 6 7890 1234",
      },
      {
        name: "Peter Smit",
        email: "peter.smit@email.nl",
        phone: "+31 6 8901 2345",
      },
      {
        name: "Anouk Hendriks",
        email: "anouk.hendriks@email.nl",
        phone: "+31 6 9012 3456",
      },
      {
        name: "Bas Willems",
        email: "bas.willems@email.nl",
        phone: "+31 6 0123 4567",
      },
      {
        name: "Fleur Dijkstra",
        email: "fleur.dijkstra@email.nl",
        phone: "+31 6 1122 3344",
      },
      {
        name: "Koen Mulder",
        email: "koen.mulder@email.nl",
        phone: "+31 6 2233 4455",
      },
      {
        name: "Iris de Boer",
        email: "iris.deboer@email.nl",
        phone: "+31 6 3344 5566",
      },
      {
        name: "Daan Peters",
        email: "daan.peters@email.nl",
        phone: "+31 6 4455 6677",
      },
    ]
    const productPairs: Array<[string, number, string]>[] = [
      [["prod_01", 2, "#c4a574"], ["prod_08", 1, "#d4b896"]],
      [["prod_06", 1, "#6b7280"], ["prod_03", 1, "#a67c52"]],
      [["prod_05", 1, "#8b7355"]],
      [["prod_12", 2, "#3b82f6"], ["prod_04", 3, "#b45309"]],
      [["prod_05", 1, "#8b7355"]],
      [["prod_15", 1, "#78716c"], ["prod_09", 2, "#a8a29e"]],
      [["prod_03", 1, "#a67c52"]],
      [["prod_07", 1, "#60a5fa"], ["prod_11", 2, "#94a3b8"]],
      [["prod_21", 1, "#78716c"], ["prod_02", 3, "#d97706"]],
      [["prod_22", 2, "#64748b"], ["prod_20", 2, "#ca8a04"]],
      [["prod_14", 4, "#1e293b"]],
      [["prod_06", 1, "#6b7280"], ["prod_01", 3, "#c4a574"]],
      [["prod_24", 1, "#a3e635"], ["prod_13", 2, "#ea580c"]],
      [["prod_25", 2, "#0ea5e9"], ["prod_04", 1, "#b45309"]],
    ]
    const pair = productPairs[index] ?? productPairs[0]!
    const lines = pair.map(([pid, qty, color]) =>
      lineFromProduct(p(pid), qty, color)
    )
    const shipped = index % 3 !== 2
    return buildDetail(order.id, {
      customer: customers[index] ?? customers[0]!,
      lines,
      status: shipped ? "Verzonden" : "In behandeling",
      shipping_status: shipped ? "Onderweg" : "Nog niet verzonden",
      tracking_code: shipped ? `3SDEVE${8800000000 + index}` : null,
      message_ids: index < 8 ? [`msg_${String(index + 1).padStart(2, "0")}`] : [],
      return_ids:
        order.order_number === "EM-2026-10418"
          ? ["ret_01"]
          : order.order_number === "EM-2026-10364"
            ? ["ret_02"]
            : order.order_number === "EM-2026-10271"
              ? ["ret_03"]
              : [],
      invoice_uploaded: index % 2 === 0,
      shipping_cost: index % 4 === 0 ? 0 : 4.95,
    })
  }
)

export const DEMO_MESSAGE_THREADS: DemoMessageThread[] = [
  {
    id: "msg_01",
    order_id: "ord_01",
    order_number: "EM-2026-10482",
    return_id: null,
    customer_name: "Sanne de Vries",
    customer_email: "sanne.devries@email.nl",
    subject: "Vraag over levertijd",
    unread: true,
    updated_at: "2026-08-05T07:12:00Z",
    messages: [
      {
        id: "b1",
        sender: "customer",
        body: "Kunnen jullie aangeven wanneer dit pakket wordt verzonden?",
        created_at: "2026-08-04T16:00:00Z",
      },
      {
        id: "b2",
        sender: "customer",
        body: "Ik heb het nodig voor het weekend.",
        created_at: "2026-08-05T07:12:00Z",
      },
    ],
  },
  {
    id: "msg_02",
    order_id: "ord_02",
    order_number: "EM-2026-10471",
    return_id: null,
    customer_name: "Mark Janssen",
    customer_email: "mark.janssen@email.nl",
    subject: "Beschadigde verpakking",
    unread: true,
    updated_at: "2026-08-04T19:40:00Z",
    messages: [
      {
        id: "b1",
        sender: "customer",
        body: "De doos was licht beschadigd, product zelf lijkt intact.",
        created_at: "2026-08-04T18:10:00Z",
        attachment_name: "foto-doos.jpg",
      },
      {
        id: "b2",
        sender: "seller",
        body: "Vervelend om te horen. Mag ik een foto van het product zelf?",
        created_at: "2026-08-04T19:00:00Z",
      },
      {
        id: "b3",
        sender: "customer",
        body: "Zie bijlage — alles ziet er goed uit verder.",
        created_at: "2026-08-04T19:40:00Z",
        attachment_name: "product.jpg",
      },
    ],
  },
  {
    id: "msg_03",
    order_id: "ord_04",
    order_number: "EM-2026-10432",
    return_id: null,
    customer_name: "Tom Vermeer",
    customer_email: "tom.vermeer@email.nl",
    subject: "Factuuradres wijzigen",
    unread: true,
    updated_at: "2026-08-03T11:05:00Z",
    messages: [
      {
        id: "b1",
        sender: "customer",
        body: "Is het mogelijk het factuuradres nog aan te passen?",
        created_at: "2026-08-03T11:05:00Z",
      },
    ],
  },
  {
    id: "msg_04",
    order_id: "ord_06",
    order_number: "EM-2026-10397",
    return_id: null,
    customer_name: "Joris Meijer",
    customer_email: "joris.meijer@email.nl",
    subject: "Bedankt voor snelle levering",
    unread: false,
    updated_at: "2026-07-26T09:20:00Z",
    messages: [
      {
        id: "b1",
        sender: "customer",
        body: "Alles netjes aangekomen, top service!",
        created_at: "2026-07-26T09:00:00Z",
      },
      {
        id: "b2",
        sender: "seller",
        body: "Fijn om te horen, dankjewel!",
        created_at: "2026-07-26T09:20:00Z",
      },
    ],
  },
  {
    id: "msg_05",
    order_id: "ord_07",
    order_number: "EM-2026-10381",
    return_id: null,
    customer_name: "Nina Kuiper",
    customer_email: "nina.kuiper@email.nl",
    subject: "Andere maat mogelijk?",
    unread: false,
    updated_at: "2026-07-23T16:55:00Z",
    messages: [
      {
        id: "b1",
        sender: "customer",
        body: "Hebben jullie de sloffen ook in maat 40?",
        created_at: "2026-07-23T15:00:00Z",
      },
      {
        id: "b2",
        sender: "seller",
        body: "Ja, maat 40 is op voorraad. Wilt u omruilen?",
        created_at: "2026-07-23T16:55:00Z",
      },
    ],
  },
  {
    id: "msg_06",
    order_id: "ord_08",
    order_number: "EM-2026-10364",
    return_id: "ret_02",
    customer_name: "Peter Smit",
    customer_email: "peter.smit@email.nl",
    subject: "Track & trace",
    unread: true,
    updated_at: "2026-07-19T08:10:00Z",
    messages: [
      {
        id: "b1",
        sender: "customer",
        body: "De trackingcode lijkt niet te werken in PostNL.",
        created_at: "2026-07-19T08:10:00Z",
      },
    ],
  },
  {
    id: "msg_07",
    order_id: "ord_09",
    order_number: "EM-2026-10341",
    return_id: null,
    customer_name: "Anouk Hendriks",
    customer_email: "anouk.hendriks@email.nl",
    subject: "Cadeauverpakking",
    unread: false,
    updated_at: "2026-07-15T12:30:00Z",
    messages: [
      {
        id: "b1",
        sender: "customer",
        body: "Kunnen jullie volgende keer cadeaupapier meeleveren?",
        created_at: "2026-07-15T12:00:00Z",
      },
      {
        id: "b2",
        sender: "seller",
        body: "Dat noteren we graag bij uw volgende bestelling.",
        created_at: "2026-07-15T12:30:00Z",
      },
    ],
  },
  {
    id: "msg_08",
    order_id: "ord_11",
    order_number: "EM-2026-10298",
    return_id: null,
    customer_name: "Fleur Dijkstra",
    customer_email: "fleur.dijkstra@email.nl",
    subject: "Allergie-informatie",
    unread: false,
    updated_at: "2026-07-06T10:45:00Z",
    messages: [
      {
        id: "b1",
        sender: "customer",
        body: "Bevat de honing sporen van noten?",
        created_at: "2026-07-06T10:00:00Z",
      },
      {
        id: "b2",
        sender: "seller",
        body: "Nee, onze honing is notenvrij geproduceerd.",
        created_at: "2026-07-06T10:45:00Z",
      },
    ],
  },
]

export const DEMO_RETURN_DETAILS: DemoReturnDetail[] = [
  {
    id: "ret_01",
    return_number: "RET-2026-031",
    order_id: "ord_05",
    order_number: "EM-2026-10418",
    customer_name: "Emma Visser",
    customer_email: "emma.visser@email.nl",
    status: "Aangevraagd",
    reason: "Product voldoet niet aan verwachting",
    comments: "Kleur is anders dan op de foto.",
    created_at: "2026-08-01T10:00:00Z",
    amount: 49.0,
    products: [
      {
        product_name: "Friese Wolvilt Sloffen Maat 42",
        sku: "8712345678905",
        quantity: 1,
        unit_price: 49.0,
      },
    ],
    photo_labels: ["sloffen-zijkant.jpg", "verpakking.jpg"],
    message_id: null,
  },
  {
    id: "ret_02",
    return_number: "RET-2026-028",
    order_id: "ord_08",
    order_number: "EM-2026-10364",
    customer_name: "Peter Smit",
    customer_email: "peter.smit@email.nl",
    status: "Bevestigd",
    reason: "Verkeerde kleur ontvangen",
    comments: "Verwachtte beige, kreeg grijs.",
    created_at: "2026-07-20T14:22:00Z",
    amount: 18.5,
    products: [
      {
        product_name: "Twentse Linnen Theedoek Set",
        sku: "8712345678909",
        quantity: 1,
        unit_price: 18.5,
      },
    ],
    photo_labels: ["theedoek-kleur.jpg"],
    message_id: "msg_06",
  },
  {
    id: "ret_03",
    return_number: "RET-2026-022",
    order_id: "ord_12",
    order_number: "EM-2026-10271",
    customer_name: "Koen Mulder",
    customer_email: "koen.mulder@email.nl",
    status: "Ontvangen",
    reason: "Defect bij aankomst",
    comments: "Handvat van pan is los.",
    created_at: "2026-07-02T09:15:00Z",
    amount: 59.0,
    products: [
      {
        product_name: "Rotterdamse Havenlicht LED",
        sku: "8712345678912",
        quantity: 1,
        unit_price: 59.0,
      },
    ],
    photo_labels: ["defect-handvat.jpg"],
    message_id: null,
  },
]

export const DEMO_SPONSORED_CAMPAIGNS: DemoSponsoredCampaign[] = [
  {
    id: "sp_01",
    name: "Olijfolie boost augustus",
    product_ids: ["prod_01"],
    product_titles: ["Noordzee Olijfolie Extra Vierge 500 ml"],
    cpc: 0.35,
    daily_budget: 25,
    starts_at: "2026-08-01",
    ends_at: "2026-08-31",
    status: "Actief",
    clicks: 418,
    spend: 146.3,
    conversions: 27,
  },
  {
    id: "sp_02",
    name: "Keuken essentials",
    product_ids: ["prod_03", "prod_06"],
    product_titles: [
      "Brabantse Kaasplank Eiken 40 cm",
      "Zeeuwse Mosselpan Gietijzer 28 cm",
    ],
    cpc: 0.42,
    daily_budget: 40,
    starts_at: "2026-07-15",
    ends_at: "2026-08-15",
    status: "Gepauzeerd",
    clicks: 290,
    spend: 121.8,
    conversions: 14,
  },
]

export const DEMO_SELLER_INVOICES: DemoSellerInvoice[] = [
  {
    id: "sinv_01",
    order_number: "EM-2026-10482",
    file_name: "factuur-EM-2026-10482.pdf",
    uploaded_at: "2026-08-04T16:00:00Z",
    amount: 87.4,
    status: "Gekoppeld",
  },
  {
    id: "sinv_02",
    order_number: "EM-2026-10471",
    file_name: "factuur-EM-2026-10471.pdf",
    uploaded_at: "2026-08-03T12:30:00Z",
    amount: 124.85,
    status: "Gekoppeld",
  },
]

export function getOrderDetail(id: string): DemoOrderDetail | undefined {
  return DEMO_ORDER_DETAILS.find((o) => o.id === id || o.order_number === id)
}

export function getMessageThread(id: string): DemoMessageThread | undefined {
  return DEMO_MESSAGE_THREADS.find((t) => t.id === id)
}

export function getReturnDetail(id: string): DemoReturnDetail | undefined {
  return DEMO_RETURN_DETAILS.find(
    (r) => r.id === id || r.return_number === id
  )
}
