import {
  assertScheduleStatus,
  assertStartTrigger,
  AUTOMATION_START_TRIGGERS,
  describeChosenStart,
  describeProgramStart,
  pickDeliveryVariant,
  planMessageSchedule,
  planProgramStart,
  programActivationErrors,
  scheduleInstant,
} from "../automation-start"

describe("automation start", () => {
  it("names a chosen existing trigger and stays quiet without one", () => {
    expect(describeChosenStart("seller_onboarded").note).toBe(
      "Start wanneer: Een verkoper is onboarded."
    )
    expect(describeChosenStart("first_sale").title).toMatch(/eerste bestelling/i)
    expect(describeChosenStart(null).title).toBe("Deze automatisering start niet vanzelf")
    expect(describeChosenStart("consumer_cart_abandoned").note).toMatch(/niet beschikbaar/)
    expect(describeChosenStart("consumer_first_order").note).toMatch(/eerste bestelling/i)
    expect(() => assertStartTrigger("nep")).toThrow(/niet beschikbaar/)
    expect(() => assertStartTrigger("affiliate_campaign_started")).toThrow(/niet beschikbaar/)
    expect(assertStartTrigger("first_product")).toBe("first_product")
    expect(assertStartTrigger("affiliate_approved")).toBe("affiliate_approved")
    expect(AUTOMATION_START_TRIGGERS.some((item) => item.audience === "consumers" && !item.available)).toBe(true)
    expect(AUTOMATION_START_TRIGGERS.some((item) => item.available && item.audience === "consumers")).toBe(true)
    expect(AUTOMATION_START_TRIGGERS.some((item) => item.available && item.audience === "affiliates")).toBe(true)
  })

  it("stores a planned moment without sending", () => {
    expect(
      planMessageSchedule({
        communicationType: "newsletter",
        scheduled_at: "2026-11-15T19:00",
        schedule_timezone: "Europe/Amsterdam",
        audience: "consumers",
      }).schedule_status
    ).toBe("scheduled")
    expect(
      describeProgramStart({
        start_mode: "scheduled",
        scheduled_at: "2026-11-15T19:00",
        schedule_timezone: "Europe/Amsterdam",
      }).title
    ).toBe("15 november 2026 om 19:00")
    expect(() =>
      planProgramStart({
        programType: "campaign",
        start_mode: "scheduled",
        scheduled_at: "2026-11-15T19:00",
        schedule_timezone: "Europe/Amsterdam",
        audience: null,
      })
    ).toThrow(/doelgroep/)
    expect(() =>
      planMessageSchedule({
        communicationType: "onboarding",
        scheduled_at: "2026-11-15T19:00",
        schedule_timezone: "Europe/Amsterdam",
        audience: "consumers",
      })
    ).toThrow(/nieuwsbrief of campagne/)
    expect(() => assertScheduleStatus("sent")).toThrow(/Verzonden/)
    expect(scheduleInstant("2026-11-15T19:00", "Europe/Amsterdam")?.toISOString()).toBe(
      "2026-11-15T18:00:00.000Z"
    )
    expect(scheduleInstant("2026-07-15T19:00", "Europe/Amsterdam")?.toISOString()).toBe(
      "2026-07-15T17:00:00.000Z"
    )
    expect(() =>
      planProgramStart({
        programType: "onboarding",
        start_mode: "event",
        start_trigger: "account_created",
      })
    ).toThrow(/gegevens of voorwaarden/)
    const problems = programActivationErrors({
      name: "",
      programType: "newsletter",
      start_mode: "scheduled",
      scheduled_at: null,
      schedule_timezone: "Europe/Amsterdam",
      audience: "consumers",
      steps: [],
    })
    expect(problems.join(" ")).toMatch(/naam/)
    expect(problems.join(" ")).toMatch(/bericht/)
  })

  it("uses the recipient language and otherwise the source version", () => {
    const variants = [
      { id: "bron", locale: "nl" },
      { id: "en", locale: "en" },
    ]
    expect(pickDeliveryVariant({ variants, sourceVariantId: "bron", recipientLocale: "en-GB" })).toBe("en")
    expect(pickDeliveryVariant({ variants, sourceVariantId: "bron", recipientLocale: "de" })).toBe("bron")
    expect(pickDeliveryVariant({ variants, sourceVariantId: "bron", recipientLocale: null })).toBe("bron")
  })
})
