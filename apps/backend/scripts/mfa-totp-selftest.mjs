/**
 * Local MFA TOTP self-check (no DB secret reads).
 * Run: node scripts/mfa-totp-selftest.mjs
 */
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto"

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
const TOTP_STEP_SECONDS = 30
const TOTP_DIGITS = 6
const TOTP_WINDOW = 1

function base32Encode(buffer) {
  let bits = 0
  let value = 0
  let output = ""
  for (const byte of buffer) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31]
  }
  return output
}

function base32Decode(input) {
  const cleaned = input
    .replace(/=+$/g, "")
    .toUpperCase()
    .replace(/[^A-Z2-7]/g, "")
  let bits = 0
  let value = 0
  const bytes = []
  for (const char of cleaned) {
    const idx = alphabet.indexOf(char)
    if (idx === -1) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}

function hotp(secret, counter) {
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64BE(BigInt(counter))
  const hmac = createHmac("sha1", secret).update(buf).digest()
  const offset = hmac[hmac.length - 1] & 0xf
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  return String(code % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0")
}

function verifyTotp(secretBase32, code, now = Date.now()) {
  const normalized = code.replace(/\s/g, "")
  if (!/^\d{6}$/.test(normalized)) return false
  const secret = base32Decode(secretBase32)
  const counter = Math.floor(now / 1000 / TOTP_STEP_SECONDS)
  for (let w = -TOTP_WINDOW; w <= TOTP_WINDOW; w++) {
    const expected = hotp(secret, counter + w)
    const a = Buffer.from(expected)
    const b = Buffer.from(normalized)
    if (a.length === b.length && timingSafeEqual(a, b)) return true
  }
  return false
}

// RFC 4226 appendix D — HOTP test values (6 digits)
const rfcSecret = Buffer.from("12345678901234567890")
const rfcCases = [
  [0, "755224"],
  [1, "287082"],
  [2, "359152"],
  [3, "969429"],
  [4, "338314"],
  [5, "254676"],
  [6, "287922"],
  [7, "162583"],
  [8, "399871"],
  [9, "520489"],
]
let fail = 0
for (const [counter, expected] of rfcCases) {
  const got = hotp(rfcSecret, counter)
  if (got !== expected) {
    console.error("HOTP fail", { counter, expected, got })
    fail++
  }
}

const b32 = base32Encode(rfcSecret)
const round = base32Decode(b32)
if (!round.equals(rfcSecret)) {
  console.error("base32 roundtrip fail", { b32, round: [...round], orig: [...rfcSecret] })
  fail++
}

const liveSecret = base32Encode(randomBytes(20))
const liveCode = hotp(base32Decode(liveSecret), Math.floor(Date.now() / 1000 / 30))
if (!verifyTotp(liveSecret, liveCode)) {
  console.error("live verify fail")
  fail++
}

console.log(JSON.stringify({ ok: fail === 0, fail, b32_len: b32.length, live_code: liveCode }, null, 2))
process.exit(fail === 0 ? 0 : 1)
