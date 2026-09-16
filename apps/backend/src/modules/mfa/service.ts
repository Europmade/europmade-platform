import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto"
import {
  InjectManager,
  MedusaContext,
  MedusaError,
  MedusaService,
} from "@medusajs/framework/utils"
import type { Context } from "@medusajs/framework/types"
import { MfaChallenge, MfaCredential, MfaRecoveryCode } from "./models"

const RECOVERY_CODE_COUNT = 8
const CHALLENGE_TTL_MS = 10 * 60 * 1000
const TOTP_STEP_SECONDS = 30
const TOTP_DIGITS = 6
const TOTP_WINDOW = 1
/** Spec §1.7 — "Vertrouw dit apparaat" default 30 dagen. */
const TRUSTED_DEVICE_TTL_MS = 30 * 24 * 60 * 60 * 1000

function trustSigningSecret(): string {
  return (
    process.env.MFA_TRUST_SECRET ||
    process.env.JWT_SECRET ||
    process.env.COOKIE_SECRET ||
    "europmade-local-mfa-trust-dev-only"
  )
}

function createTrustedDeviceToken(customerId: string): string {
  const expiresAt = Date.now() + TRUSTED_DEVICE_TTL_MS
  const payload = `${customerId}.${expiresAt}`
  const sig = createHmac("sha256", trustSigningSecret())
    .update(payload)
    .digest("base64url")
  return `${payload}.${sig}`
}

function verifyTrustedDeviceToken(
  token: string,
  expectedCustomerId: string
): boolean {
  const parts = token.split(".")
  if (parts.length !== 3) return false
  const [customerId, expiresRaw, sig] = parts
  if (!customerId || !expiresRaw || !sig) return false
  if (customerId !== expectedCustomerId) return false
  const expiresAt = Number(expiresRaw)
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false
  const payload = `${customerId}.${expiresRaw}`
  const expected = createHmac("sha256", trustSigningSecret())
    .update(payload)
    .digest("base64url")
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

function base32Encode(buffer: Buffer): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
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

function base32Decode(input: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
  const cleaned = input.replace(/=+$/g, "").toUpperCase().replace(/[^A-Z2-7]/g, "")
  let bits = 0
  let value = 0
  const bytes: number[] = []
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

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64BE(BigInt(counter))
  const hmac = createHmac("sha1", secret).update(buf).digest()
  const offset = hmac[hmac.length - 1] & 0xf
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  const str = String(code % 10 ** TOTP_DIGITS)
  return str.padStart(TOTP_DIGITS, "0")
}

function verifyTotp(secretBase32: string, code: string, now = Date.now()): boolean {
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

function hashRecoveryCode(code: string): string {
  return createHash("sha256")
    .update(code.trim().toUpperCase())
    .digest("hex")
}

function generateRecoveryCodes(): string[] {
  const codes: string[] = []
  for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
    const raw = randomBytes(4).toString("hex").toUpperCase()
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4)}`)
  }
  return codes
}

function formatManualKey(secret: string): string {
  return secret.replace(/(.{4})/g, "$1 ").trim()
}

/**
 * 2FA (TOTP + herstelcodes) — authenticatie/spec.md §1.7–1.8.
 */
class MfaModuleService extends MedusaService({
  MfaCredential,
  MfaRecoveryCode,
  MfaChallenge,
}) {
  @InjectManager()
  async getStatus(
    customer_id: string,
    @MedusaContext() sharedContext: Context = {}
  ) {
    const active = await this.listMfaCredentials(
      { customer_id, status: "active" },
      {},
      sharedContext
    )
    const pending = await this.listMfaCredentials(
      { customer_id, status: "pending" },
      {},
      sharedContext
    )
    return {
      enabled: active.length > 0,
      pending: pending.length > 0 && active.length === 0,
    }
  }

  @InjectManager()
  async startEnroll(
    customer_id: string,
    accountLabel: string,
    @MedusaContext() sharedContext: Context = {}
  ) {
    const status = await this.getStatus(customer_id, sharedContext)
    if (status.enabled) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Tweestapsverificatie is al actief op dit account."
      )
    }

    const existingPending = await this.listMfaCredentials(
      { customer_id, status: "pending" },
      {},
      sharedContext
    )
    for (const row of existingPending) {
      await this.deleteMfaCredentials(row.id, sharedContext)
    }

    const secret = base32Encode(randomBytes(20))
    await this.createMfaCredentials(
      {
        customer_id,
        type: "totp",
        secret,
        status: "pending",
      },
      sharedContext
    )

    const issuer = "EuropMade"
    const label = encodeURIComponent(`${issuer}:${accountLabel}`)
    const otpauth_url = `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_STEP_SECONDS}`

    return {
      secret,
      manual_entry_key: formatManualKey(secret),
      otpauth_url,
    }
  }

  @InjectManager()
  async confirmEnroll(
    customer_id: string,
    code: string,
    @MedusaContext() sharedContext: Context = {}
  ) {
    const [pending] = await this.listMfaCredentials(
      { customer_id, status: "pending" },
      { order: { created_at: "DESC" } },
      sharedContext
    )
    if (!pending) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Geen openstaande 2FA-setup gevonden. Start opnieuw."
      )
    }
    if (!verifyTotp(pending.secret, code)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Deze verificatiecode is onjuist."
      )
    }

    const oldActive = await this.listMfaCredentials(
      { customer_id, status: "active" },
      {},
      sharedContext
    )
    for (const row of oldActive) {
      await this.updateMfaCredentials(
        { id: row.id, status: "revoked" },
        sharedContext
      )
    }

    await this.updateMfaCredentials(
      { id: pending.id, status: "active" },
      sharedContext
    )

    const oldCodes = await this.listMfaRecoveryCodes(
      { customer_id },
      {},
      sharedContext
    )
    for (const row of oldCodes) {
      await this.deleteMfaRecoveryCodes(row.id, sharedContext)
    }

    const recovery_codes = generateRecoveryCodes()
    await this.createMfaRecoveryCodes(
      recovery_codes.map((codePlain) => ({
        customer_id,
        code_hash: hashRecoveryCode(codePlain),
        used_at: null,
      })),
      sharedContext
    )

    return { enabled: true as const, recovery_codes }
  }

  @InjectManager()
  async createChallenge(
    customer_id: string,
    auth_token: string,
    trust_token?: string | null,
    @MedusaContext() sharedContext: Context = {}
  ) {
    const status = await this.getStatus(customer_id, sharedContext)
    if (!status.enabled) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Tweestapsverificatie is niet actief op dit account."
      )
    }

    if (trust_token && verifyTrustedDeviceToken(trust_token, customer_id)) {
      return { skipped: true as const, id: null, expires_at: null }
    }

    const created = await this.createMfaChallenges(
      {
        customer_id,
        auth_token,
        expires_at: new Date(Date.now() + CHALLENGE_TTL_MS),
        consumed_at: null,
      },
      sharedContext
    )
    const row = Array.isArray(created) ? created[0] : created
    return {
      skipped: false as const,
      id: row.id,
      expires_at: new Date(row.expires_at).toISOString(),
    }
  }

  async issueTrustedDeviceToken(customer_id: string) {
    return createTrustedDeviceToken(customer_id)
  }

  @InjectManager()
  async verifyChallenge(
    challenge_id: string,
    method: "totp" | "recovery_code",
    code: string,
    @MedusaContext() sharedContext: Context = {}
  ) {
    const challenge = await this.retrieveMfaChallenge(
      challenge_id,
      {},
      sharedContext
    )
    if (challenge.consumed_at) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Deze verificatie is al gebruikt."
      )
    }
    if (new Date(challenge.expires_at).getTime() < Date.now()) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Deze verificatie is verlopen. Log opnieuw in."
      )
    }

    if (method === "totp") {
      const [active] = await this.listMfaCredentials(
        { customer_id: challenge.customer_id, status: "active" },
        {},
        sharedContext
      )
      if (!active || !verifyTotp(active.secret, code)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Deze verificatiecode is onjuist."
        )
      }
    } else {
      const hash = hashRecoveryCode(code)
      const matches = await this.listMfaRecoveryCodes(
        { customer_id: challenge.customer_id, code_hash: hash },
        {},
        sharedContext
      )
      const unused = matches.find((row) => !row.used_at)
      if (!unused) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Deze herstelcode is onjuist of al gebruikt."
        )
      }
      await this.updateMfaRecoveryCodes(
        { id: unused.id, used_at: new Date() },
        sharedContext
      )
    }

    await this.updateMfaChallenges(
      { id: challenge.id, consumed_at: new Date() },
      sharedContext
    )

    return {
      token: challenge.auth_token,
      customer_id: challenge.customer_id,
    }
  }
}

export default MfaModuleService
