const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  "jwt",
  "apikey",
  "api_key",
])

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase()
  return (
    SENSITIVE_KEYS.has(lower) ||
    lower.includes("password") ||
    lower.includes("secret") ||
    lower.includes("token")
  )
}

function serializeValue(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[max-depth]"
  if (value === null || value === undefined) return value
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value
  }
  if (typeof value === "bigint") return value.toString()
  if (value instanceof Error) {
    return serializeWorkflowErrorObject(value, depth + 1)
  }
  if (Array.isArray(value)) {
    return value.map((item) => serializeValue(item, depth + 1))
  }
  if (typeof value === "object") {
    return serializeWorkflowErrorObject(value, depth + 1)
  }
  return String(value)
}

/**
 * Normalize Medusa/workflow errors for logging and import reports.
 */
export function serializeWorkflowErrorObject(
  err: unknown,
  depth = 0
): Record<string, unknown> {
  if (err === null || err === undefined) {
    return { message: String(err) }
  }
  if (typeof err === "string") {
    return { message: err }
  }
  if (err instanceof Error) {
    const extra = err as Error & {
      type?: string
      code?: string
      cause?: unknown
      errors?: unknown
      details?: unknown
      step?: string
      stepId?: string
      workflowId?: string
      workflow_id?: string
    }
    return {
      message: extra.message,
      name: extra.name,
      type: extra.type,
      code: extra.code,
      step: extra.step,
      stepId: extra.stepId,
      workflowId: extra.workflowId ?? extra.workflow_id,
      stack: extra.stack,
      cause: extra.cause ? serializeValue(extra.cause, depth + 1) : undefined,
      errors: extra.errors ? serializeValue(extra.errors, depth + 1) : undefined,
      details: extra.details ? serializeValue(extra.details, depth + 1) : undefined,
    }
  }
  if (typeof err === "object") {
    const obj = err as Record<string, unknown>
    const out: Record<string, unknown> = {}
    const keys = [
      ...new Set([...Object.keys(obj), ...Object.getOwnPropertyNames(obj)]),
    ]
    for (const key of keys) {
      if (isSensitiveKey(key)) {
        out[key] = "[redacted]"
        continue
      }
      try {
        out[key] = serializeValue(obj[key], depth + 1)
      } catch {
        out[key] = "[unserializable]"
      }
    }
    if (!("message" in out) && typeof obj.message === "string") {
      out.message = obj.message
    }
    return out
  }
  return { message: String(err) }
}

export function formatWorkflowError(err: unknown): string {
  return JSON.stringify(serializeWorkflowErrorObject(err), null, 2)
}

export function workflowErrorMessage(err: unknown): string {
  const serialized = serializeWorkflowErrorObject(err)
  if (typeof serialized.message === "string" && serialized.message.trim()) {
    return serialized.message
  }
  return formatWorkflowError(err)
}
