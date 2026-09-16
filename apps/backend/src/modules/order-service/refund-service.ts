/**
 * Refund execution port — simulated in local/dev, PSP later (ADR-0023/0040).
 * Never stores real payment instrument data.
 */

export type RefundLifecycleStatus =
  | "requested"
  | "processing"
  | "processed"
  | "failed"
  | "forced"

export type RefundExecutionInput = {
  return_id: string
  amount: number
  currency_code?: string
  forced?: boolean
}

export type RefundExecutionResult = {
  status: RefundLifecycleStatus
  reference: string
  executed_at: string
  provider: "simulated" | "psp"
}

export interface RefundService {
  executeRefund(input: RefundExecutionInput): Promise<RefundExecutionResult>
}

/** Local/dev simulated refund — fail-closed in production unless ALLOW_SIMULATED_REFUND. */
export class SimulatedRefundService implements RefundService {
  async executeRefund(
    input: RefundExecutionInput
  ): Promise<RefundExecutionResult> {
    if (process.env.NODE_ENV === "production") {
      const allow = process.env.ALLOW_SIMULATED_REFUND === "true"
      if (!allow) {
        return {
          status: "failed",
          reference: `fail_${input.return_id}`,
          executed_at: new Date().toISOString(),
          provider: "simulated",
        }
      }
    }
    const forced = Boolean(input.forced)
    return {
      status: forced ? "forced" : "processed",
      reference: `sim_${input.return_id}_${Date.now()}`,
      executed_at: new Date().toISOString(),
      provider: "simulated",
    }
  }
}

let singleton: RefundService | null = null

export function getRefundService(): RefundService {
  if (!singleton) {
    singleton = new SimulatedRefundService()
  }
  return singleton
}

/** Map legacy NL refund_status values → lifecycle status. */
export function normalizeRefundStatus(
  value: string | null | undefined
): RefundLifecycleStatus | null {
  if (!value) return null
  if (value === "Pending" || value === "requested") return "requested"
  if (value === "processing") return "processing"
  if (value === "Uitgevoerd" || value === "processed") return "processed"
  if (value === "Geforceerd" || value === "forced") return "forced"
  if (value === "failed") return "failed"
  return null
}

export function toStoredRefundStatus(
  status: RefundLifecycleStatus
): "requested" | "processing" | "processed" | "failed" | "forced" {
  return status
}
