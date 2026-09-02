"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Badge, Button, FileUpload, Input } from "@europmade/ui"
import { SellerGate } from "../_components/seller-gate"
import { DEMO_COMPANY } from "../_lib/demo-data"
import {
  getPartnerAccount,
  type PartnerAccountResponse,
} from "../_lib/partner-account-api"
import { useStorefrontLocale } from "../../_lib/i18n/use-storefront-locale"
import { t, tFormat, type StorefrontMessageKey } from "../../_lib/i18n/messages"

type SettingsSectionId =
  | "company"
  | "roles"
  | "users"
  | "permissions"
  | "bank"
  | "vat"
  | "logo"
  | "banner"
  | "return_address"
  | "shipping_address"
  | "notifications"
  | "security"
  | "api_keys"

const SECTION_KEYS: Array<{
  id: SettingsSectionId
  titleKey: StorefrontMessageKey
}> = [
  { id: "company", titleKey: "sellerSettingsCompany" },
  { id: "roles", titleKey: "sellerSettingsRoles" },
  { id: "users", titleKey: "sellerSettingsUsers" },
  { id: "permissions", titleKey: "sellerSettingsPermissions" },
  { id: "bank", titleKey: "sellerSettingsBank" },
  { id: "vat", titleKey: "sellerSettingsVat" },
  { id: "logo", titleKey: "sellerSettingsLogo" },
  { id: "banner", titleKey: "sellerSettingsBanner" },
  { id: "return_address", titleKey: "sellerSettingsReturnAddress" },
  { id: "shipping_address", titleKey: "sellerSettingsShippingAddress" },
  { id: "notifications", titleKey: "sellerSettingsNotifications" },
  { id: "security", titleKey: "sellerSettingsSecurity" },
  { id: "api_keys", titleKey: "sellerSettingsApiKeys" },
]

const ROLE_LABEL: Record<string, StorefrontMessageKey> = {
  RETAILER: "sellerSettingsRoleRetailer",
  BRAND_OWNER: "sellerRoleBrandOwner",
  PRODUCER: "sellerRoleProducerOnly",
}

/**
 * Partner-instellingen — bedrijfsgegevens, rollen, gebruikers, rechten.
 */
export default function SellerSettingsPage() {
  const locale = useStorefrontLocale()
  const [active, setActive] = useState<SettingsSectionId>("company")
  const [actionNote, setActionNote] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [account, setAccount] = useState<PartnerAccountResponse | null>(null)
  const [returnAddress, setReturnAddress] = useState(
    DEMO_COMPANY.return_address
  )
  const [shippingAddress, setShippingAddress] = useState(
    DEMO_COMPANY.shipping_address
  )
  const company = account?.partner.company
  const demo = DEMO_COMPANY

  useEffect(() => {
    void getPartnerAccount()
      .then(setAccount)
      .catch(() => setAccount(null))
  }, [])

  function markSaved(labelKey: StorefrontMessageKey) {
    setActionNote(
      tFormat("sellerSettingsSavedDemo", locale, {
        label: t(labelKey, locale),
      })
    )
  }

  const activeTitleKey =
    SECTION_KEYS.find((s) => s.id === active)?.titleKey ?? "sellerNavSettings"

  return (
    <SellerGate
      breadcrumb={[
        { label: t("sellerDashboardTitle", locale), href: "/seller" },
        { label: t("sellerNavSettings", locale) },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">
        {t("sellerNavSettings", locale)}
      </h1>
      <p className="mt-1.5 text-xs text-wf-600">
        {t("sellerSettingsIntro", locale)}
      </p>

      <div className="mt-4 rounded-lg border border-wf-300 bg-wf-50 p-3 text-xs">
        <p className="font-semibold text-wf-900">Verzending</p>
        <p className="mt-1 text-wf-600">
          Beheer verzendprofielen centraal en koppel ze aan meerdere producten.
        </p>
        <Link
          href="/seller/settings/shipping"
          className="mt-2 inline-flex text-[11px] font-semibold underline"
        >
          Naar verzendprofielen →
        </Link>
      </div>

      {actionNote ? (
        <p className="mt-4 text-xs text-wf-600">{actionNote}</p>
      ) : null}

      <div className="mt-6 flex flex-col gap-5 tablet:flex-row">
        <nav
          className="w-full shrink-0 tablet:w-[200px]"
          aria-label={t("sellerSettingsNavAria", locale)}
        >
          <ul className="rounded-lg border border-wf-300 bg-white p-2">
            {SECTION_KEYS.map((section) => (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => setActive(section.id)}
                  className={`w-full rounded-md px-3 py-2 text-left text-xs ${
                    active === section.id
                      ? "bg-wf-900 font-semibold text-white"
                      : "text-wf-700 hover:bg-wf-100"
                  }`}
                >
                  {t(section.titleKey, locale)}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <section className="min-w-0 flex-1 rounded-lg border border-wf-300 bg-white px-5 py-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="text-xs font-semibold text-wf-900">
              {t(activeTitleKey, locale)}
            </h2>
            <Badge variant="outline">{t("commonAvailable", locale)}</Badge>
          </div>

          {active === "company" ? (
            <dl className="grid gap-2 text-xs text-wf-800 tablet:grid-cols-2">
              <div>
                <dt className="text-[10.5px] uppercase tracking-[0.04em] text-wf-500">
                  {t("sellerSettingsCompanyName", locale)}
                </dt>
                <dd>{company?.legal_name || demo.legal_name}</dd>
              </div>
              <div>
                <dt className="text-[10.5px] uppercase tracking-[0.04em] text-wf-500">
                  {t("sellerSettingsKvk", locale)}
                </dt>
                <dd>
                  {company?.chamber_of_commerce_number ||
                    demo.chamber_of_commerce_number}
                </dd>
              </div>
              <div>
                <dt className="text-[10.5px] uppercase tracking-[0.04em] text-wf-500">
                  {t("commonCountry", locale)}
                </dt>
                <dd>{company?.country_code || demo.country_code}</dd>
              </div>
              <div>
                <dt className="text-[10.5px] uppercase tracking-[0.04em] text-wf-500">
                  {t("sellerSettingsRoles", locale)}
                </dt>
                <dd>
                  {(account?.partner.roles || [])
                    .map((role) =>
                      ROLE_LABEL[role] ? t(ROLE_LABEL[role], locale) : role
                    )
                    .join(", ") || "—"}
                </dd>
              </div>
            </dl>
          ) : null}

          {active === "roles" ? (
            <ul className="space-y-1 text-xs text-wf-800">
              {(account?.partner.roles || []).map((role) => (
                <li key={role}>
                  {ROLE_LABEL[role] ? t(ROLE_LABEL[role], locale) : role}
                </li>
              ))}
              {(account?.partner.roles || []).length === 0 ? <li>—</li> : null}
            </ul>
          ) : null}

          {active === "users" ? (
            <ul className="space-y-2 text-xs text-wf-800">
              {(account?.users || []).map((user) => (
                <li key={user.id} className="rounded border border-wf-200 p-2">
                  <p className="font-semibold">
                    {user.email || user.customer_id}
                    {user.is_current ? " (jij)" : ""}
                  </p>
                  <p className="text-wf-500">{user.roles.join(", ") || "—"}</p>
                </li>
              ))}
            </ul>
          ) : null}

          {active === "permissions" ? (
            <ul className="space-y-1 text-xs text-wf-800">
              {(account?.partner.permissions || []).map((permission) => (
                <li key={permission}>{permission}</li>
              ))}
            </ul>
          ) : null}

          {active === "bank" ? (
            <p className="text-xs text-wf-800">
              IBAN:{" "}
              {(company?.iban || demo.iban).replace(
                /^(.{4}).+(.{4})$/,
                "$1••••••••$2"
              )}
            </p>
          ) : null}

          {active === "vat" ? (
            <p className="text-xs text-wf-800">
              {company?.vat_number || demo.vat_number}
            </p>
          ) : null}

          {active === "logo" ? (
            <div className="max-w-md">
              <FileUpload
                label={t("sellerSettingsLogoUpload", locale)}
                requirementLabel={t("sellerSettingsLogoReq", locale)}
                accept="image/png,image/svg+xml,.svg,.png"
                value={logoFile}
                onChange={setLogoFile}
              />
              <div className="mt-3">
                <Button
                  type="button"
                  onClick={() => markSaved("sellerSettingsLogo")}
                >
                  {t("commonSave", locale)}
                </Button>
              </div>
            </div>
          ) : null}

          {active === "banner" ? (
            <div className="max-w-md">
              <FileUpload
                label={t("sellerSettingsBannerUpload", locale)}
                requirementLabel={t("sellerSettingsBannerReq", locale)}
                accept="image/jpeg,image/png"
                value={bannerFile}
                onChange={setBannerFile}
              />
              <div className="mt-3">
                <Button
                  type="button"
                  onClick={() => markSaved("sellerSettingsBanner")}
                >
                  {t("commonSave", locale)}
                </Button>
              </div>
            </div>
          ) : null}

          {active === "return_address" ? (
            <div className="max-w-xl">
              <Input
                label={t("sellerSettingsReturnAddress", locale)}
                value={returnAddress}
                onChange={(e) => setReturnAddress(e.target.value)}
              />
              <div className="mt-3">
                <Button
                  type="button"
                  onClick={() => markSaved("sellerSettingsReturnAddress")}
                >
                  {t("commonSave", locale)}
                </Button>
              </div>
            </div>
          ) : null}

          {active === "shipping_address" ? (
            <div className="max-w-xl">
              <Input
                label={t("sellerSettingsShippingAddress", locale)}
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
              />
              <div className="mt-3">
                <Button
                  type="button"
                  onClick={() => markSaved("sellerSettingsShippingAddress")}
                >
                  {t("commonSave", locale)}
                </Button>
              </div>
            </div>
          ) : null}

          {active === "notifications" ? (
            <div className="space-y-2 text-xs text-wf-800">
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked />
                {t("sellerSettingsNotifyOrder", locale)}
              </label>
              <div className="mt-3">
                <Button
                  type="button"
                  onClick={() => markSaved("sellerSettingsNotifications")}
                >
                  {t("commonSave", locale)}
                </Button>
              </div>
            </div>
          ) : null}

          {active === "security" ? (
            <div className="space-y-3 text-xs text-wf-800">
              <p>{t("sellerSettingsPasswordChanged", locale)}</p>
              <Button
                type="button"
                onClick={() => markSaved("sellerSettingsSecurity")}
              >
                {t("sellerSettingsChangePassword", locale)}
              </Button>
            </div>
          ) : null}

          {active === "api_keys" ? (
            <div className="text-xs text-wf-800">
              <p className="mb-2">{t("sellerSettingsApiEmpty", locale)}</p>
              <Button
                type="button"
                onClick={() => markSaved("sellerSettingsApiKeys")}
              >
                {t("sellerSettingsNewKey", locale)}
              </Button>
            </div>
          ) : null}
        </section>
      </div>
    </SellerGate>
  )
}
