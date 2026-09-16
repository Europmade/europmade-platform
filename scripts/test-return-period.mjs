/**
 * Unit checks for computeReturnPeriod (30 days from delivered_at).
 * node --experimental-strip-types scripts/test-return-period.mjs
 */
import {
  computeReturnPeriod,
  RETURN_PERIOD_DAYS,
} from "../packages/utils/src/returns/period.ts"

const results = []
function ok(name, pass, detail = "") {
  results.push({ name, pass })
  console.log(`${pass ? "OK" : "FAIL"}: ${name}${detail ? " — " + detail : ""}`)
}

ok("period_days_constant", RETURN_PERIOD_DAYS === 30, String(RETURN_PERIOD_DAYS))

const undelivered = computeReturnPeriod({ deliveredAt: null })
ok(
  "no_deadline_without_delivery",
  undelivered.deadline_at === null &&
    undelivered.starts_after_delivery === true &&
    undelivered.days_remaining === null &&
    undelivered.is_open === false
)

const deliveredAt = new Date("2026-08-01T12:00:00.000Z")
const now = new Date("2026-08-10T12:00:00.000Z")
const open = computeReturnPeriod({ deliveredAt, now })
ok("period_days_30", open.period_days === 30)
ok("anchor_delivered_at", open.anchor_source === "delivered_at")
ok(
  "deadline_plus_30",
  open.deadline_at === "2026-08-31T12:00:00.000Z",
  open.deadline_at
)
ok("days_remaining", open.days_remaining === 21, String(open.days_remaining))
ok("is_open", open.is_open === true)

const after = computeReturnPeriod({
  deliveredAt,
  now: new Date("2026-09-01T12:00:00.000Z"),
})
ok("closed_after_deadline", after.is_open === false)

const failed = results.filter((r) => !r.pass).length
console.log(`---\nPASSED=${results.length - failed} FAILED=${failed}`)
process.exit(failed ? 1 : 0)
