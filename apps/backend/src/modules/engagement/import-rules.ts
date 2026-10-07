import {
  isOrganizationRole,
  isSalesModel,
  type OrganizationRoleValue,
  type SalesModel,
} from "./prospect-rules"

export type ImportField =
  | "company_name"
  | "contact_name"
  | "email"
  | "website"
  | "category"
  | "role"
  | "sales_model"

export type ImportVerdict = "new" | "existing" | "possible_duplicate" | "invalid"

export type ImportRow = {
  company_name: string
  contact_name: string
  email: string
  website: string
  category: string
  role: string
  sales_model: string
}

export type ClassifiedImportRow = ImportRow & {
  verdict: ImportVerdict
  message: string
  sales_model_token: SalesModel
  role_token: OrganizationRoleValue
}

const VERDICT_MESSAGE: Record<ImportVerdict, string> = {
  new: "Nieuw",
  existing: "Bestaat al",
  possible_duplicate: "Mogelijke dubbele",
  invalid: "Kan niet worden geïmporteerd",
}

function compact(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

function companyKey(value: string): string {
  return compact(value)
    .replace(/\b(bv|b\.v\.|gmbh|ltd|inc|nv|ag|sa)\b/g, "")
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

export function mapSalesModel(value: string): SalesModel {
  const key = compact(value)
  if (!key || key === "onbekend" || key === "unknown") return "unknown"
  if (
    key.includes("consument") ||
    key.includes("direct") ||
    key === "dtc" ||
    key === "direct_to_consumer"
  ) {
    return "direct_to_consumer"
  }
  if (key.includes("reseller") || key === "reseller_only") return "reseller_only"
  if (key === "beide" || key === "mixed" || key.includes("mix")) return "mixed"
  if (key.includes("partner") || key === "brand_seeking_partners") {
    return "brand_seeking_partners"
  }
  return isSalesModel(key) ? key : "unknown"
}

export function mapRole(value: string): OrganizationRoleValue {
  const key = compact(value)
  if (!key || key === "onbekend" || key === "unknown") return "unknown"
  if (key === "merk" || key === "brand") return "brand"
  if (key === "verkoper" || key === "seller") return "seller"
  if (key === "producent" || key === "manufacturer" || key === "fabrikant") {
    return "manufacturer"
  }
  if (key === "distributeur" || key === "distributor") return "distributor"
  if (key === "retailer" || key === "winkel") return "retailer"
  if (key === "overig" || key === "other") return "other"
  return isOrganizationRole(key) ? key : "unknown"
}

function validEmail(value: string): boolean {
  const email = value.trim().toLowerCase()
  return email.includes("@") && !email.startsWith("@") && !email.endsWith("@")
}

export function classifyImportRows(
  rows: ImportRow[],
  existing: Array<{ company_name: string; emails: string[] }>
): ClassifiedImportRow[] {
  const companies = new Set(
    existing.map((item) => companyKey(item.company_name)).filter(Boolean)
  )
  const emails = new Set(
    existing.flatMap((item) =>
      item.emails.map((email) => email.trim().toLowerCase()).filter(Boolean)
    )
  )
  const seenCompanies = new Set<string>()
  const seenEmails = new Set<string>()
  return rows.map((row) => {
    const company = row.company_name.trim()
    const email = row.email.trim().toLowerCase()
    const base = {
      ...row,
      company_name: company,
      email,
      sales_model_token: mapSalesModel(row.sales_model),
      role_token: mapRole(row.role),
    }
    if (!company || !validEmail(email)) {
      return { ...base, verdict: "invalid" as const, message: VERDICT_MESSAGE.invalid }
    }
    const firm = companyKey(company)
    if (emails.has(email) || seenEmails.has(email)) {
      return { ...base, verdict: "existing" as const, message: VERDICT_MESSAGE.existing }
    }
    if (companies.has(firm) || seenCompanies.has(firm)) {
      return {
        ...base,
        verdict: "possible_duplicate" as const,
        message: VERDICT_MESSAGE.possible_duplicate,
      }
    }
    seenCompanies.add(firm)
    seenEmails.add(email)
    return { ...base, verdict: "new" as const, message: VERDICT_MESSAGE.new }
  })
}
