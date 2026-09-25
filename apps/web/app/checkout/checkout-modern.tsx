"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Button, Checkbox, Input, Notice } from "@europmade/ui"
import { StorefrontShell, VatRow, formatEuro } from "../_components/storefront-shell"
import {
  claimGuestOrder,
  mergeGuestCart,
  OrderServiceApiError,
  placeOrder,
} from "../_lib/order-service-api"
import { serializeOrderAddress, normalizeCountryCode } from "@europmade/utils"
import { CLICK_COOKIE, readCookie } from "../_lib/cookie-consent"
import { rememberPendingGuestOrder } from "../_lib/guest-checkout-token"
import { useCart } from "../_components/cart/cart-provider"
import {
  createCustomer,
  createSession,
  login,
  refreshToken,
  registerAuthIdentity,
} from "../(auth)/_lib/medusa-auth"
import {
  getCartLineMetaMap,
  type CartLineMeta,
} from "../_lib/cart-line-meta"
import { enrichOfferMetaFromCatalog } from "../_lib/client-catalog"
import {
  CartLineCard,
  resolveLineMeta,
} from "../_components/cart/cart-line-card"
import {
  PAYMENT_METHODS,
  PaymentMethodIcon,
} from "../_components/checkout/payment-icons"

type AddressFields = {
  street: string
  houseNumber: string
  addition: string
  postalCode: string
  city: string
  province: string
  country: string
  countryCode: string
}

type PaymentId = (typeof PAYMENT_METHODS)[number]["id"]

const CHECKOUT_COUNTRIES: Array<{ code: string; label: string }> = [
  { code: "NL", label: "Nederland" },
  { code: "BE", label: "België" },
  { code: "DE", label: "Deutschland" },
  { code: "FR", label: "France" },
  { code: "AT", label: "Österreich" },
  { code: "ES", label: "España" },
  { code: "IT", label: "Italia" },
  { code: "IE", label: "Ireland" },
  { code: "PT", label: "Portugal" },
  { code: "PL", label: "Polska" },
]

function composeAddress(a: AddressFields, name?: string) {
  return serializeOrderAddress({
    name: name ?? null,
    street: a.street,
    house_number: a.houseNumber,
    addition: a.addition,
    postal_code: a.postalCode,
    city: a.city,
    province: a.province,
    country: a.country,
    country_code: a.countryCode || normalizeCountryCode(a.country),
  })
}

function emptyAddress(): AddressFields {
  return {
    street: "",
    houseNumber: "",
    addition: "",
    postalCode: "",
    city: "",
    province: "",
    country: "Nederland",
    countryCode: "NL",
  }
}

export default function CheckoutModernPage() {
  const router = useRouter()
  const { cart, loading, refresh, itemCount } = useCart()

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [hasAccount, setHasAccount] = useState(false)
  const [createAfterOrder, setCreateAfterOrder] = useState(false)
  const [loginEmail, setLoginEmail] = useState("")
  const [accountPassword, setAccountPassword] = useState("")
  const [accountPasswordConfirm, setAccountPasswordConfirm] = useState("")
  const [accountLoggedIn, setAccountLoggedIn] = useState(false)

  const [shippingAddress, setShippingAddress] = useState<AddressFields>(emptyAddress)
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true)
  const [billingAddress, setBillingAddress] = useState<AddressFields>(emptyAddress)
  const [shippingBySeller, setShippingBySeller] = useState<
    Record<string, "standard" | "express">
  >({})
  const [paymentMethod, setPaymentMethod] = useState<PaymentId>("ideal")
  const [terms, setTerms] = useState(false)
  const [affiliateCoupon, setAffiliateCoupon] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [authBusy, setAuthBusy] = useState(false)
  const [metaMap, setMetaMap] = useState<Record<string, CartLineMeta>>({})

  useEffect(() => {
    if (!loading && !cart) void refresh()
  }, [cart, loading, refresh])

  const isAuthenticated = !!cart && !cart.guest_token

  const groups = useMemo(() => {
    if (!cart) return [] as Array<[string, typeof cart.lines]>
    const map = new Map<string, typeof cart.lines>()
    for (const line of cart.lines) {
      const bucket = map.get(line.seller_id) ?? []
      bucket.push(line)
      map.set(line.seller_id, bucket)
    }
    return [...map.entries()]
  }, [cart])

  useEffect(() => {
    if (!cart) return
    setShippingBySeller((prev) => {
      const next = { ...prev }
      for (const [sellerId] of groups) {
        if (!next[sellerId]) next[sellerId] = "standard"
      }
      return next
    })
  }, [cart, groups])

  useEffect(() => {
    if (!cart?.lines.length) return
    const cached = getCartLineMetaMap(cart.lines.map((l) => l.offer_id))
    setMetaMap(cached)
    let cancelled = false
    void (async () => {
      const next = { ...cached }
      for (const line of cart.lines) {
        if (next[line.offer_id]?.title && !next[line.offer_id].title.startsWith("Product ")) {
          continue
        }
        const enriched = await enrichOfferMetaFromCatalog(line.offer_id, line.seller_id)
        if (enriched) next[line.offer_id] = enriched
      }
      if (!cancelled) setMetaMap(next)
    })()
    return () => {
      cancelled = true
    }
  }, [cart])

  async function handleInlineLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const mail = (loginEmail || email).trim()
    if (!mail || !accountPassword.trim()) {
      setError("Vul e-mailadres en wachtwoord in om in te loggen.")
      return
    }
    setAuthBusy(true)
    setError(null)
    try {
      const result = await login(mail, accountPassword)
      if (!result.token) {
        throw new OrderServiceApiError("Inloggen vereist aanvullende verificatie.")
      }
      await createSession(result.token)
      await mergeGuestCart()
      await refresh()
      setEmail(mail)
      setLoginEmail(mail)
      if (!fullName.trim()) {
        const local = mail.split("@")[0] ?? ""
        setFullName(local.replace(/[._-]+/g, " "))
      }
      setAccountLoggedIn(true)
      setAccountPassword("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inline inloggen is mislukt.")
    } finally {
      setAuthBusy(false)
    }
  }

  async function onPlace() {
    if (!cart) return
    if (!fullName.trim() || !email.trim()) {
      return setError("Vul je naam en e-mailadres in.")
    }
    const shippingComposed = composeAddress(shippingAddress, fullName)
    const billingComposed = billingSameAsShipping
      ? shippingComposed
      : composeAddress(billingAddress, fullName)
    if (!shippingComposed || !billingComposed) {
      return setError("Vul aflever- en factuuradres volledig in.")
    }
    if (!shippingAddress.postalCode.trim() || !shippingAddress.city.trim()) {
      return setError("Vul postcode en plaats in voor het afleveradres.")
    }
    if (hasAccount && !isAuthenticated && !accountLoggedIn) {
      return setError("Log eerst inline in voordat je bestelt.")
    }
    if (createAfterOrder) {
      if (accountPassword.trim().length < 8) {
        return setError("Wachtwoord minimaal 8 tekens.")
      }
      if (accountPassword !== accountPasswordConfirm) {
        return setError("Wachtwoorden komen niet overeen.")
      }
    }
    if (!terms) return setError("Accepteer de voorwaarden om te bestellen.")

    setBusy(true)
    setError(null)
    try {
      const payment_reference = `pay-${Date.now()}-${Math.floor(Math.random() * 9999)}`
      const asGuest = !isAuthenticated
      const result = await placeOrder({
        payment_reference,
        shipping_address: shippingComposed,
        billing_address: billingComposed,
        delivery_country: shippingAddress.countryCode || "NL",
        lines: cart.lines.map((l) => ({
          offer_id: l.offer_id,
          quantity: l.quantity,
        })),
        affiliate_click_id: readCookie(CLICK_COOKIE),
        affiliate_coupon_code: affiliateCoupon.trim()
          ? affiliateCoupon.trim().toUpperCase()
          : null,
        guest_checkout: asGuest,
      })
      if (asGuest) rememberPendingGuestOrder(result.payment_reference)

      let confirmationGuest = asGuest
      if (asGuest && createAfterOrder) {
        const reg = await registerAuthIdentity(email.trim(), accountPassword.trim())
        const [firstName, ...rest] = fullName.trim().split(/\s+/)
        await createCustomer(reg.token, {
          email: email.trim(),
          first_name: firstName || undefined,
          last_name: rest.join(" ") || undefined,
        })
        const refreshed = await refreshToken(reg.token)
        await createSession(refreshed.token)
        await claimGuestOrder(result.payment_reference)
        await refresh()
        confirmationGuest = false
      }

      router.push(
        `/order/confirmation?payment_reference=${encodeURIComponent(result.payment_reference)}&order_set_id=${encodeURIComponent(result.order_set_id)}${confirmationGuest ? "&guest=1" : ""}`
      )
    } catch (err) {
      setError(
        err instanceof OrderServiceApiError
          ? err.message
          : "Bestelling plaatsen mislukt."
      )
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <StorefrontShell>
        <p className="py-16 text-sm text-wf-600">Checkout laden…</p>
      </StorefrontShell>
    )
  }

  if (!cart || cart.lines.length === 0) {
    return (
      <StorefrontShell>
        <Notice variant="warning" className="mt-10 max-w-xl">
          {error ?? "Je winkelwagen is leeg."}
        </Notice>
        <Button className="mt-6" type="button" onClick={() => router.push("/cart")}>
          Naar winkelwagen
        </Button>
      </StorefrontShell>
    )
  }

  return (
    <StorefrontShell cartCount={itemCount}>
      <div className="mx-auto max-w-[1120px] py-1 [&_.mb-4]:mb-2">
        <h1 className="mb-4 text-[22px] font-bold tracking-tight text-wf-900">
          Afrekenen
        </h1>

        <div className="grid gap-4 desktop:grid-cols-[minmax(0,1.7fr)_minmax(260px,0.75fr)] desktop:gap-5">
          <div className="space-y-3">
            {/* 1 Contact */}
            <section className="rounded-xl border border-wf-200 bg-white p-3.5 tablet:p-4">
              <h2 className="mb-2.5 text-[15px] font-bold text-wf-900">1. Contactgegevens</h2>
              <div className="grid gap-x-3 gap-y-0 tablet:grid-cols-2">
                <Input
                  label="Naam"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Voor- en achternaam"
                  className="h-10"
                />
                <Input
                  label="E-mailadres"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="naam@voorbeeld.nl"
                  className="h-10"
                />
                <Input
                  label="Telefoon (optioneel)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+31 6 12345678"
                  className="h-10"
                />
              </div>

              <div className="mt-2 space-y-2 border-t border-wf-100 pt-2.5">
                <Checkbox
                  checked={hasAccount}
                  onChange={(e) => {
                    const v = e.target.checked
                    setHasAccount(v)
                    if (v) setCreateAfterOrder(false)
                  }}
                  label="Ik heb al een account"
                />
                {hasAccount ? (
                  <form
                    onSubmit={(e) => void handleInlineLogin(e)}
                    className="space-y-0 rounded-lg border border-wf-200 bg-wf-50/80 p-3"
                  >
                    <Input
                      label="E-mailadres"
                      type="email"
                      value={loginEmail || email}
                      onChange={(e) => {
                        setLoginEmail(e.target.value)
                        setEmail(e.target.value)
                      }}
                      placeholder="naam@voorbeeld.nl"
                      className="h-10"
                    />
                    <Input
                      label="Wachtwoord"
                      type="password"
                      value={accountPassword}
                      onChange={(e) => setAccountPassword(e.target.value)}
                      placeholder="Je wachtwoord"
                      className="h-10"
                    />
                    <div className="flex flex-wrap items-center gap-2 pb-1">
                      <Button type="submit" disabled={authBusy || isAuthenticated}>
                        {authBusy
                          ? "Inloggen…"
                          : isAuthenticated || accountLoggedIn
                            ? "Ingelogd"
                            : "Inloggen"}
                      </Button>
                      {isAuthenticated || accountLoggedIn ? (
                        <span className="text-xs text-wf-600">
                          Gegevens blijven op deze pagina. Winkelwagen behouden.
                        </span>
                      ) : null}
                    </div>
                  </form>
                ) : null}

                <Checkbox
                  checked={createAfterOrder}
                  onChange={(e) => {
                    const v = e.target.checked
                    setCreateAfterOrder(v)
                    if (v) setHasAccount(false)
                  }}
                  label="Na mijn bestelling een account aanmaken"
                />
                {createAfterOrder ? (
                  <div className="grid gap-x-3 gap-y-0 rounded-lg border border-wf-200 bg-wf-50/80 p-3 tablet:grid-cols-2">
                    <Input
                      label="Wachtwoord"
                      type="password"
                      value={accountPassword}
                      onChange={(e) => setAccountPassword(e.target.value)}
                      placeholder="Minimaal 8 tekens"
                      className="h-10"
                    />
                    <Input
                      label="Herhaal wachtwoord"
                      type="password"
                      value={accountPasswordConfirm}
                      onChange={(e) => setAccountPasswordConfirm(e.target.value)}
                      placeholder="Herhaal wachtwoord"
                      className="h-10"
                    />
                  </div>
                ) : null}
              </div>
            </section>

            {/* 2 Shipping */}
            <section className="rounded-xl border border-wf-200 bg-white p-3.5 tablet:p-4">
              <h2 className="mb-2.5 text-[15px] font-bold text-wf-900">2. Afleveradres</h2>
              <div className="grid gap-x-3 gap-y-0 tablet:grid-cols-2">
                <Input label="Straat" value={shippingAddress.street} onChange={(e) => setShippingAddress((s) => ({ ...s, street: e.target.value }))} className="h-10" />
                <Input label="Huisnummer" value={shippingAddress.houseNumber} onChange={(e) => setShippingAddress((s) => ({ ...s, houseNumber: e.target.value }))} className="h-10" />
                <Input label="Toevoeging" value={shippingAddress.addition} onChange={(e) => setShippingAddress((s) => ({ ...s, addition: e.target.value }))} className="h-10" />
                <Input label="Postcode" value={shippingAddress.postalCode} onChange={(e) => setShippingAddress((s) => ({ ...s, postalCode: e.target.value }))} className="h-10" />
                <Input label="Plaats" value={shippingAddress.city} onChange={(e) => setShippingAddress((s) => ({ ...s, city: e.target.value }))} className="h-10" />
                <Input label="Provincie (optioneel)" value={shippingAddress.province} onChange={(e) => setShippingAddress((s) => ({ ...s, province: e.target.value }))} className="h-10" />
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500">
                    Land
                  </label>
                  <select
                    className="h-10 w-full rounded-[5px] border border-wf-400 bg-white px-3 text-sm text-wf-800"
                    value={shippingAddress.countryCode}
                    onChange={(e) => {
                      const code = e.target.value
                      const label =
                        CHECKOUT_COUNTRIES.find((c) => c.code === code)?.label ??
                        code
                      setShippingAddress((s) => ({
                        ...s,
                        countryCode: code,
                        country: label,
                      }))
                    }}
                  >
                    {CHECKOUT_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-1">
                <Checkbox
                  checked={billingSameAsShipping}
                  onChange={(e) => setBillingSameAsShipping(e.target.checked)}
                  label="Factuuradres is gelijk aan afleveradres"
                />
              </div>
            </section>

            {/* 3 Billing */}
            {!billingSameAsShipping ? (
              <section className="rounded-xl border border-wf-200 bg-white p-3.5 tablet:p-4">
                <h2 className="mb-2.5 text-[15px] font-bold text-wf-900">3. Factuuradres</h2>
                <div className="grid gap-x-3 gap-y-0 tablet:grid-cols-2">
                  <Input label="Straat" value={billingAddress.street} onChange={(e) => setBillingAddress((s) => ({ ...s, street: e.target.value }))} className="h-10" />
                  <Input label="Huisnummer" value={billingAddress.houseNumber} onChange={(e) => setBillingAddress((s) => ({ ...s, houseNumber: e.target.value }))} className="h-10" />
                  <Input label="Toevoeging" value={billingAddress.addition} onChange={(e) => setBillingAddress((s) => ({ ...s, addition: e.target.value }))} className="h-10" />
                  <Input label="Postcode" value={billingAddress.postalCode} onChange={(e) => setBillingAddress((s) => ({ ...s, postalCode: e.target.value }))} className="h-10" />
                  <Input label="Plaats" value={billingAddress.city} onChange={(e) => setBillingAddress((s) => ({ ...s, city: e.target.value }))} className="h-10" />
                  <Input label="Provincie (optioneel)" value={billingAddress.province} onChange={(e) => setBillingAddress((s) => ({ ...s, province: e.target.value }))} className="h-10" />
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500">
                      Land
                    </label>
                    <select
                      className="h-10 w-full rounded-[5px] border border-wf-400 bg-white px-3 text-sm text-wf-800"
                      value={billingAddress.countryCode}
                      onChange={(e) => {
                        const code = e.target.value
                        const label =
                          CHECKOUT_COUNTRIES.find((c) => c.code === code)
                            ?.label ?? code
                        setBillingAddress((s) => ({
                          ...s,
                          countryCode: code,
                          country: label,
                        }))
                      }}
                    >
                      {CHECKOUT_COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>
            ) : null}

            {/* 4 Shipping method */}
            <section className="rounded-xl border border-wf-200 bg-white p-3.5 tablet:p-4">
              <h2 className="mb-2.5 text-[15px] font-bold text-wf-900">
                {billingSameAsShipping ? "3" : "4"}. Verzendmethode
              </h2>
              <div className="space-y-2">
                {groups.map(([sellerId, lines]) => {
                  const meta = resolveLineMeta(lines[0], metaMap)
                  return (
                    <div key={sellerId} className="rounded-lg border border-wf-200 px-3 py-2.5">
                      <p className="mb-1.5 text-xs font-semibold text-wf-900">
                        {meta.seller_name}
                      </p>
                      <label className="mb-1 flex cursor-pointer items-center gap-2 text-[13px] text-wf-800">
                        <input
                          type="radio"
                          name={`ship-${sellerId}`}
                          checked={(shippingBySeller[sellerId] ?? "standard") === "standard"}
                          onChange={() =>
                            setShippingBySeller((v) => ({ ...v, [sellerId]: "standard" }))
                          }
                        />
                        <span>
                          <span className="font-semibold">Standaard</span>
                          <span className="text-wf-600"> · 2–4 werkdagen</span>
                        </span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 text-[13px] text-wf-800">
                        <input
                          type="radio"
                          name={`ship-${sellerId}`}
                          checked={(shippingBySeller[sellerId] ?? "standard") === "express"}
                          onChange={() =>
                            setShippingBySeller((v) => ({ ...v, [sellerId]: "express" }))
                          }
                        />
                        <span>
                          <span className="font-semibold">Express</span>
                          <span className="text-wf-600"> · morgen</span>
                        </span>
                      </label>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* 5 Payment */}
            <section className="rounded-xl border border-wf-200 bg-white p-3.5 tablet:p-4">
              <h2 className="mb-2.5 text-[15px] font-bold text-wf-900">
                {billingSameAsShipping ? "4" : "5"}. Betaalmethode
              </h2>
              <div className="grid gap-1.5 tablet:grid-cols-2">
                {PAYMENT_METHODS.map((method) => (
                  <label
                    key={method.id}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-2.5 py-2 text-[13px] transition ${
                      paymentMethod === method.id
                        ? "border-wf-900 bg-wf-50 ring-1 ring-wf-900"
                        : "border-wf-200 hover:border-wf-400"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      className="sr-only"
                      checked={paymentMethod === method.id}
                      onChange={() => setPaymentMethod(method.id)}
                    />
                    <PaymentMethodIcon id={method.id} />
                    <span className="font-semibold text-wf-900">{method.label}</span>
                  </label>
                ))}
              </div>
            </section>

            {/* 7 Place order */}
            <section className="rounded-xl border border-wf-200 bg-white p-3.5 tablet:p-4">
              <div className="mb-3 [&>.mb-4]:mb-0">
                <Input
                  label="Affiliate kortingscode (optioneel)"
                  value={affiliateCoupon}
                  onChange={(e) => setAffiliateCoupon(e.target.value)}
                  placeholder="bijv. EMABCD12"
                  autoComplete="off"
                />
              </div>
              <Checkbox
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
                label="Ik ga akkoord met de algemene voorwaarden"
              />
              {error ? (
                <Notice variant="warning" className="mt-2.5">
                  {error}
                </Notice>
              ) : null}
              <Button
                className="mt-3 h-12 w-full rounded-xl bg-black text-[15px] font-bold tracking-wide text-white shadow-md hover:bg-zinc-900"
                type="button"
                disabled={busy || !terms}
                onClick={() => void onPlace()}
              >
                {busy ? "BESTELLING PLAATSEN…" : "BESTELLING PLAATSEN"}
              </Button>
            </section>
          </div>

          {/* 6 Order summary sticky */}
          <aside className="h-fit rounded-xl border border-wf-200 bg-white p-3 shadow-sm desktop:sticky desktop:top-4">
            <h2 className="mb-2 text-[14px] font-bold text-wf-900">
              {billingSameAsShipping ? "5" : "6"}. Orderoverzicht
            </h2>
            {cart.split_notice || groups.length > 1 ? (
              <Notice className="mb-2.5">
                Je bestelling wordt opgesplitst in meerdere leveringen.
              </Notice>
            ) : null}

            <div className="space-y-3">
              {groups.map(([sellerId, lines]) => {
                const sellerMeta = resolveLineMeta(lines[0], metaMap)
                return (
                  <div key={sellerId}>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-wf-500">
                      {sellerMeta.seller_name}
                    </p>
                    <ul className="divide-y divide-wf-100">
                      {lines.map((l) => (
                        <li key={l.line_id}>
                          <CartLineCard
                            line={l}
                            meta={resolveLineMeta(l, metaMap)}
                            compact
                          />
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1 text-[11px] text-wf-600">
                      Verzendoptie:{" "}
                      {(shippingBySeller[sellerId] ?? "standard") === "express"
                        ? "Express · morgen"
                        : `Standaard · ${resolveLineMeta(lines[0], metaMap).delivery}`}
                    </p>
                  </div>
                )
              })}
            </div>

            <div className="mt-3 space-y-1.5 border-t border-wf-200 pt-3 text-sm">
              <div className="flex justify-between text-wf-700">
                <span>Subtotaal</span>
                <span>{formatEuro(cart.totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-wf-700">
                <span>Verzendkosten</span>
                <span>
                  {cart.totals.shipping_total <= 0
                    ? "Gratis"
                    : formatEuro(cart.totals.shipping_total)}
                </span>
              </div>
              <VatRow
                amount={cart.totals.vat_amount}
                tooltip={cart.totals.vat_tooltip}
              />
              <div className="flex justify-between border-t border-wf-200 pt-2 text-base font-bold text-wf-900">
                <span>Totaal</span>
                <span>{formatEuro(cart.totals.total)}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </StorefrontShell>
  )
}
