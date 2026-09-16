/**
 * node --experimental-strip-types scripts/test-promised-delivery.mjs
 */
import {
  addCalendarDays,
  computePromisedDeliveryDate,
  resolveDeliveryEstimateCategory,
  resolvePromisedDeliveryUrgency,
  DELIVERY_CATEGORY_MAX_BUSINESS_DAYS,
} from "../packages/utils/src/shipping/promised-delivery.ts"

const results = []
function ok(name, pass, detail = "") {
  results.push({ name, pass })
  console.log(`${pass ? "OK" : "FAIL"}: ${name}${detail ? " — " + detail : ""}`)
}

const cat = resolveDeliveryEstimateCategory({
  shipping_cost: 0,
  quantity_available: 10,
})
ok("category_tomorrow", cat === "tomorrow", cat)

const created = "2026-08-10T10:00:00.000Z"
const promised = computePromisedDeliveryDate({
  orderCreatedAt: created,
  maxBusinessDays: DELIVERY_CATEGORY_MAX_BUSINESS_DAYS["2_4_business_days"],
})
ok("promised_from_business_days", promised === "2026-08-14", promised)

const withExpected = computePromisedDeliveryDate({
  orderCreatedAt: created,
  maxBusinessDays: 7,
  expectedDeliveryAt: "2026-08-20T00:00:00.000Z",
})
ok("expected_overrides", withExpected === "2026-08-20", withExpected)

const today = "2026-08-15"
ok(
  "due_tomorrow",
  resolvePromisedDeliveryUrgency({
    promisedDeliveryDate: addCalendarDays(today, 1),
    shippingStatus: "pending",
    now: new Date(`${today}T15:00:00+02:00`),
    timeZone: "Europe/Amsterdam",
  }) === "due_tomorrow"
)
ok(
  "overdue_past",
  resolvePromisedDeliveryUrgency({
    promisedDeliveryDate: addCalendarDays(today, -1),
    shippingStatus: "pending",
    now: new Date(`${today}T15:00:00+02:00`),
    timeZone: "Europe/Amsterdam",
  }) === "overdue"
)
ok(
  "no_warn_when_shipped",
  resolvePromisedDeliveryUrgency({
    promisedDeliveryDate: addCalendarDays(today, 1),
    shippingStatus: "shipped",
    now: new Date(`${today}T15:00:00+02:00`),
    timeZone: "Europe/Amsterdam",
  }) === null
)
ok(
  "no_warn_when_in_transit",
  resolvePromisedDeliveryUrgency({
    promisedDeliveryDate: addCalendarDays(today, -2),
    shippingStatus: "in_transit",
    now: new Date(`${today}T15:00:00+02:00`),
    timeZone: "Europe/Amsterdam",
  }) === null
)

const failed = results.filter((r) => !r.pass).length
console.log(`---\nPASSED=${results.length - failed} FAILED=${failed}`)
process.exit(failed ? 1 : 0)
