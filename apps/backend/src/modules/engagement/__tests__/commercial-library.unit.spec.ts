import { AUTOMATION_START_TRIGGERS } from "../automation-start"
import {
  COMMERCIAL_MESSAGES,
  COMMERCIAL_PROGRAMS,
  LIBRARY_TOKENS,
} from "../commercial-library"

const allowed = new Set<string>(LIBRARY_TOKENS)

describe("commercial library", () => {
  it("keeps every message a draft concept and every trigger available", () => {
    const byId = new Map(COMMERCIAL_MESSAGES.map((message) => [message.id, message]))
    expect(new Set(COMMERCIAL_MESSAGES.map((message) => message.id)).size).toBe(
      COMMERCIAL_MESSAGES.length
    )
    for (const message of COMMERCIAL_MESSAGES) {
      expect(message.subject.trim().length).toBeGreaterThan(8)
      expect(message.body.trim().length).toBeGreaterThan(80)
      expect(message.cta_label.trim().length).toBeGreaterThan(2)
      expect(message.cta_url.startsWith("/")).toBe(true)
      for (const token of message.tokens) expect(allowed.has(token)).toBe(true)
      expect(message.body.includes("5%")).toBe(false)
      expect(message.body.toLowerCase().includes("no cure")).toBe(false)
      if (message.communication_type === "newsletter" || message.communication_type === "campaign") {
        expect(message.audience).toBeTruthy()
      }
    }
    const audiences = COMMERCIAL_MESSAGES.filter(
      (message) => message.audience === "consumers" || message.audience === "affiliates"
    )
    const visual = audiences.filter((message) => message.layout === "newsletter" && message.body.includes("<!--em-layout:newsletter-->"))
    expect(visual.length / audiences.length).toBeGreaterThanOrEqual(0.85)
    const personalProspects = new Set(["ctpl_lib_p_followup", "ctpl_lib_p_last", "ctpl_lib_p_meeting"])
    expect(
      COMMERCIAL_MESSAGES.filter((message) => message.id.startsWith("ctpl_lib_p_")).every((message) =>
        personalProspects.has(message.id)
          ? message.layout === "message"
          : message.layout === "newsletter" && message.body.includes("<!--em-layout:newsletter-->") && !message.body.includes("<!--em-bind:")
      )
    ).toBe(true)
    for (const program of COMMERCIAL_PROGRAMS) {
      expect(program.steps.length).toBeGreaterThan(0)
      if (program.start_trigger) {
        const trigger = AUTOMATION_START_TRIGGERS.find((item) => item.key === program.start_trigger)
        expect(trigger?.available).toBe(true)
        expect(trigger?.kind).toBe(program.start_mode)
        expect(trigger?.audience).toBe(program.audience)
      } else {
        expect(program.start_mode).toBeNull()
      }
      for (const step of program.steps) {
        const message = byId.get(step.template_id)
        expect(message?.communication_type).toBe(program.program_type)
      }
    }
  })
})
