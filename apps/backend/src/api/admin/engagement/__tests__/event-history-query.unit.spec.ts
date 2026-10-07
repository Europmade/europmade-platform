import { parseEventHistoryQuery } from "../event-history-query"

describe("event history query", () => {
  it("laat een lege query ongefilterd", () => {
    expect(parseEventHistoryQuery({})).toEqual({
      status: null,
      contactId: null,
      organizationId: null,
      contact: null,
      organization: null,
      q: null,
      templateId: null,
      from: null,
      to: null,
    })
  })

  it("accepteert een bestaande status en trimt de waarde", () => {
    expect(parseEventHistoryQuery({ status: " sent " }).status).toBe("sent")
  })

  it("weigert een onbekende status", () => {
    expect(() => parseEventHistoryQuery({ status: "marketing" })).toThrow(
      /communication-event-status/
    )
  })

  it("leest contact, organisatie en een datumbereik", () => {
    const parsed = parseEventHistoryQuery({
      contact: "Ada",
      organization: "Noord",
      contact_id: " ectc_1 ",
      organization_id: "eorg_1",
      from: "2026-10-01",
      to: "2026-10-06",
    })
    expect(parsed.contact).toBe("Ada")
    expect(parsed.organization).toBe("Noord")
    expect(parsed.contactId).toBe("ectc_1")
    expect(parsed.organizationId).toBe("eorg_1")
    expect(parseEventHistoryQuery({ q: " Maria ", template_id: " ctpl_1 " })).toEqual(
      expect.objectContaining({ q: "Maria", templateId: "ctpl_1" })
    )
    expect(parsed.from?.toISOString()).toBe("2026-10-01T00:00:00.000Z")
    expect(parsed.to?.toISOString()).toBe("2026-10-06T23:59:59.999Z")
  })

  it("weigert een ongeldige datum en een omgekeerd bereik", () => {
    expect(() => parseEventHistoryQuery({ from: "06-10-2026" })).toThrow(
      /YYYY-MM-DD/
    )
    expect(() =>
      parseEventHistoryQuery({ from: "2026-10-06", to: "2026-10-01" })
    ).toThrow(/from ligt na to/)
  })
})
