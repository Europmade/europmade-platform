import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { AFFILIATE_MODULE } from "../../modules/affiliate"
import type AffiliateModuleService from "../../modules/affiliate/service"
import { hashVisitorKey } from "../../modules/affiliate/service"
import { PARTNER_MODULE } from "../../modules/partner"
import type PartnerModuleService from "../../modules/partner/service"
import { ORDER_MODULE } from "../../modules/order-service"
import type OrderServiceModuleService from "../../modules/order-service/service"
import { FINANCE_MODULE } from "../../modules/finance"
import type FinanceModuleService from "../../modules/finance/service"
import { MODERATION_MODULE } from "../../modules/moderation"
import type ModerationModuleService from "../../modules/moderation/service"

export type RegisterAffiliateInput = {
  customer_id: string
  channel_url: string
  legal_name: string
  iban: string
  country_code?: string
  chamber_of_commerce_number?: string
  vat_number?: string | null
}

export async function executeRegisterAffiliate(
  container: MedusaContainer,
  input: RegisterAffiliateInput
) {
  const aff = container.resolve(AFFILIATE_MODULE) as AffiliateModuleService
  const partner = container.resolve(PARTNER_MODULE) as PartnerModuleService
  const eventBus = container.resolve(Modules.EVENT_BUS)

  const existing = await aff.listAffiliates(
    { customer_id: input.customer_id },
    { take: 1 }
  )
  if (existing[0]) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Er bestaat al een affiliate-aanvraag voor dit account."
    )
  }

  const channel = input.channel_url.trim()
  if (!channel) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "channel_url is verplicht."
    )
  }

  const kvk =
    input.chamber_of_commerce_number?.trim() ||
    `AFF-${input.customer_id.slice(-12)}`
  const company = await partner.createCompanies({
    legal_name: input.legal_name.trim(),
    chamber_of_commerce_number: kvk,
    vat_number: input.vat_number?.trim() || null,
    country_code: (input.country_code ?? "NL").trim().toUpperCase(),
    iban: input.iban.trim(),
  })

  const created = await aff.createAffiliates({
    customer_id: input.customer_id,
    company_id: company.id,
    onboarding_status: "Ingediend",
    approved_at: null,
    channel_url: channel,
    rejection_reason: null,
  })

  await eventBus.emit({
    name: "AffiliateApplicationSubmitted",
    data: { affiliate_id: created.id, customer_id: input.customer_id },
  })

  return { affiliate: created }
}

export async function executeDecideAffiliate(
  container: MedusaContainer,
  input: {
    affiliate_id: string
    approve: boolean
    reason?: string | null
  }
) {
  const aff = container.resolve(AFFILIATE_MODULE) as AffiliateModuleService
  const eventBus = container.resolve(Modules.EVENT_BUS)
  const row = await aff.retrieveAffiliate(input.affiliate_id)

  if (
    row.onboarding_status !== "Ingediend" &&
    row.onboarding_status !== "In beoordeling"
  ) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Affiliate is al besloten."
    )
  }

  if (input.approve) {
    const updated = await aff.updateAffiliates({
      id: row.id,
      onboarding_status: "Goedgekeurd",
      approved_at: new Date(),
      rejection_reason: null,
    })
    await eventBus.emit({
      name: "AffiliateOnboarded",
      data: { affiliate_id: updated.id, customer_id: updated.customer_id },
    })
    return { affiliate: updated }
  }

  const reason = input.reason?.trim()
  if (!reason) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "reason is verplicht bij afwijzing."
    )
  }
  const updated = await aff.updateAffiliates({
    id: row.id,
    onboarding_status: "Afgekeurd",
    rejection_reason: reason,
  })
  return { affiliate: updated }
}

export async function executeRecordConsent(
  container: MedusaContainer,
  input: { visitor_key: string; consent_given: boolean }
) {
  const aff = container.resolve(AFFILIATE_MODULE) as AffiliateModuleService
  const key = input.visitor_key.trim()
  if (key.length < 8) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "visitor_key is te kort."
    )
  }
  const visitor_hash = hashVisitorKey(key)
  const created = await aff.createConsentRecords({
    visitor_hash,
    consent_given: input.consent_given,
  })
  return { consent: created, visitor_hash }
}

export async function executeTrackClick(
  container: MedusaContainer,
  input: { tracking_param: string; visitor_key: string }
) {
  const aff = container.resolve(AFFILIATE_MODULE) as AffiliateModuleService
  const eventBus = container.resolve(Modules.EVENT_BUS)
  const settings = await aff.getActiveCommissionSettings()

  const links = await aff.listAffiliateLinks(
    { tracking_param: input.tracking_param.trim() },
    { take: 1 }
  )
  const link = links[0]
  if (!link) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Onbekende trackingparameter."
    )
  }

  const affiliate = await aff.retrieveAffiliate(link.affiliate_id)
  if (affiliate.onboarding_status !== "Goedgekeurd") {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Affiliate is niet actief."
    )
  }

  const visitor_hash = hashVisitorKey(input.visitor_key)
  const consents = await aff.listConsentRecords(
    { visitor_hash },
    { order: { created_at: "DESC" }, take: 1 }
  )
  const consent = consents[0]
  if (!consent || !consent.consent_given) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Geen geldige cookietoestemming voor tracking (ADR-0029)."
    )
  }

  const expires = new Date()
  expires.setDate(expires.getDate() + settings.attribution_days)

  const click = await aff.createClicks({
    affiliate_link_id: link.id,
    consent_record_id: consent.id,
    attribution_expires_at: expires,
  })

  await eventBus.emit({
    name: "ClickTracked",
    data: {
      click_id: click.id,
      affiliate_id: affiliate.id,
      affiliate_link_id: link.id,
      attribution_expires_at: expires.toISOString(),
    },
  })

  return {
    click,
    attribution_days: settings.attribution_days,
  }
}

export async function executeCreateLink(
  container: MedusaContainer,
  input: { customer_id: string; target_url: string }
) {
  const aff = container.resolve(AFFILIATE_MODULE) as AffiliateModuleService
  const eventBus = container.resolve(Modules.EVENT_BUS)
  const affiliate = await aff.requireApprovedAffiliate(input.customer_id)
  const target = input.target_url.trim()
  if (!target.startsWith("http://") && !target.startsWith("https://") && !target.startsWith("/")) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "target_url moet een absolute of relatieve URL zijn."
    )
  }
  const created = await aff.createAffiliateLinks({
    affiliate_id: affiliate.id,
    target_url: target,
    tracking_param: await aff.generateTrackingParam(),
  })
  await eventBus.emit({
    name: "AffiliateLinkCreated",
    data: {
      affiliate_link_id: created.id,
      affiliate_id: affiliate.id,
      tracking_param: created.tracking_param,
    },
  })
  return { link: created }
}

export async function executeCreateCoupon(
  container: MedusaContainer,
  input: { customer_id: string; code?: string }
) {
  const aff = container.resolve(AFFILIATE_MODULE) as AffiliateModuleService
  const affiliate = await aff.requireApprovedAffiliate(input.customer_id)
  const code = (
    input.code?.trim() || (await aff.generateCouponCode())
  ).toUpperCase()
  const created = await aff.createCoupons({
    affiliate_id: affiliate.id,
    code,
    status: "Actief",
  })
  return { coupon: created }
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

export type AttributeOrderInput = {
  order_id: string
  customer_id: string
  click_id?: string | null
  coupon_code?: string | null
}

export async function executeAttributeConversion(
  container: MedusaContainer,
  input: AttributeOrderInput
): Promise<{ conversion_id: string | null; commission_id: string | null }> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const aff = container.resolve(AFFILIATE_MODULE) as AffiliateModuleService
  const finance = container.resolve(FINANCE_MODULE) as FinanceModuleService
  const orders = container.resolve(ORDER_MODULE) as OrderServiceModuleService
  const eventBus = container.resolve(Modules.EVENT_BUS)

  const existing = await aff.listConversions(
    { order_id: input.order_id },
    { take: 1 }
  )
  if (existing[0]) {
    return { conversion_id: existing[0].id, commission_id: null }
  }

  let click_id: string | null = null
  let coupon_id: string | null = null
  let affiliate_id: string | null = null

  if (input.click_id?.trim()) {
    const click = await aff.retrieveClick(input.click_id.trim())
    if (new Date(click.attribution_expires_at).getTime() < Date.now()) {
      logger.info(`[affiliate] click expired order=${input.order_id}`)
      return { conversion_id: null, commission_id: null }
    }
    const link = await aff.retrieveAffiliateLink(click.affiliate_link_id)
    affiliate_id = link.affiliate_id
    click_id = click.id
  } else if (input.coupon_code?.trim()) {
    const coupons = await aff.listCoupons(
      { code: input.coupon_code.trim().toUpperCase(), status: "Actief" },
      { take: 1 }
    )
    const coupon = coupons[0]
    if (!coupon) {
      return { conversion_id: null, commission_id: null }
    }
    affiliate_id = coupon.affiliate_id
    coupon_id = coupon.id
  } else {
    return { conversion_id: null, commission_id: null }
  }

  if (!affiliate_id || (click_id && coupon_id) || (!click_id && !coupon_id)) {
    return { conversion_id: null, commission_id: null }
  }

  const affiliate = await aff.retrieveAffiliate(affiliate_id)
  if (affiliate.customer_id === input.customer_id) {
    const moderation = container.resolve(
      MODERATION_MODULE
    ) as ModerationModuleService
    await moderation.createModerationCases({
      product_id: null,
      seller_id: null,
      case_type: "Fraude-signaal",
      status: "Gesignaleerd",
      ai_metadata_id: null,
    })
    logger.warn(
      `[affiliate] self-attribution blocked affiliate=${affiliate_id} customer=${input.customer_id}`
    )
    return { conversion_id: null, commission_id: null }
  }

  const conversion = await aff.createConversions({
    order_id: input.order_id,
    click_id,
    coupon_id,
    affiliate_id,
    reversed_at: null,
  })

  await eventBus.emit({
    name: "ConversionRecorded",
    data: {
      conversion_id: conversion.id,
      order_id: input.order_id,
      affiliate_id,
      click_id,
      coupon_id,
    },
  })

  const settings = await aff.getActiveCommissionSettings()
  const lines = await orders.listOrderLines({ order_id: input.order_id })
  const subtotal = lines.reduce((sum, line) => {
    return sum + Number(line.unit_price_snapshot) * Number(line.quantity)
  }, 0)
  const amount = roundMoney(subtotal * settings.percentage)

  const commission = await finance.createCommissions({
    recipient_type: "Affiliate",
    order_id: input.order_id,
    conversion_id: conversion.id,
    amount,
    percentage: settings.percentage,
    status: "Toegekend",
  })

  await eventBus.emit({
    name: "CommissionCalculated",
    data: {
      commission_id: commission.id,
      conversion_id: conversion.id,
      order_id: input.order_id,
      affiliate_id,
      amount,
      percentage: settings.percentage,
    },
  })

  return { conversion_id: conversion.id, commission_id: commission.id }
}

export async function executeReverseConversionForOrder(
  container: MedusaContainer,
  orderId: string
) {
  const aff = container.resolve(AFFILIATE_MODULE) as AffiliateModuleService
  const finance = container.resolve(FINANCE_MODULE) as FinanceModuleService
  const eventBus = container.resolve(Modules.EVENT_BUS)

  const conversions = await aff.listConversions(
    { order_id: orderId },
    { take: 1 }
  )
  const conversion = conversions[0]
  if (!conversion || conversion.reversed_at) {
    return { reversed: false }
  }

  await aff.updateConversions({
    id: conversion.id,
    reversed_at: new Date(),
  })

  const commissions = await finance.listCommissions({
    conversion_id: conversion.id,
    status: "Toegekend",
  })
  for (const c of commissions) {
    await finance.updateCommissions({
      id: c.id,
      status: "Teruggedraaid",
      amount: 0,
    })
  }

  await eventBus.emit({
    name: "ConversionReversed",
    data: {
      conversion_id: conversion.id,
      order_id: orderId,
      affiliate_id: conversion.affiliate_id,
    },
  })

  return { reversed: true }
}

const registerStep = createStep(
  "register-affiliate",
  async (input: RegisterAffiliateInput, { container }) => {
    return new StepResponse(await executeRegisterAffiliate(container, input))
  }
)

export const registerAffiliateWorkflow = createWorkflow(
  "register-affiliate",
  (input: RegisterAffiliateInput) => {
    return new WorkflowResponse(registerStep(input))
  }
)
