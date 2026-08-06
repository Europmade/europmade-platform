"use client"

type PaymentId =
  | "ideal"
  | "visa"
  | "mastercard"
  | "paypal"
  | "bancontact"
  | "applepay"
  | "googlepay"

export const PAYMENT_METHODS: { id: PaymentId; label: string }[] = [
  { id: "ideal", label: "iDEAL" },
  { id: "visa", label: "Visa" },
  { id: "mastercard", label: "Mastercard" },
  { id: "paypal", label: "PayPal" },
  { id: "bancontact", label: "Bancontact" },
  { id: "applepay", label: "Apple Pay" },
  { id: "googlepay", label: "Google Pay" },
]

function IconShell({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <span
      className="inline-flex h-8 min-w-[52px] items-center justify-center rounded border border-wf-200 bg-white px-1.5"
      aria-label={label}
      title={label}
    >
      {children}
    </span>
  )
}

export function PaymentMethodIcon({ id }: { id: PaymentId }) {
  switch (id) {
    case "ideal":
      return (
        <IconShell label="iDEAL">
          <svg viewBox="0 0 48 24" className="h-5 w-10" aria-hidden>
            <rect width="48" height="24" rx="3" fill="#CC0066" />
            <text x="8" y="16" fill="white" fontSize="9" fontWeight="700" fontFamily="Arial">
              iDEAL
            </text>
          </svg>
        </IconShell>
      )
    case "visa":
      return (
        <IconShell label="Visa">
          <svg viewBox="0 0 48 24" className="h-5 w-10" aria-hidden>
            <rect width="48" height="24" rx="3" fill="#1A1F71" />
            <text x="10" y="16" fill="white" fontSize="10" fontWeight="700" fontFamily="Arial" fontStyle="italic">
              VISA
            </text>
          </svg>
        </IconShell>
      )
    case "mastercard":
      return (
        <IconShell label="Mastercard">
          <svg viewBox="0 0 48 24" className="h-5 w-10" aria-hidden>
            <rect width="48" height="24" rx="3" fill="#F5F5F5" />
            <circle cx="20" cy="12" r="7" fill="#EB001B" />
            <circle cx="28" cy="12" r="7" fill="#F79E1B" />
            <path d="M24 6.5a7 7 0 0 1 0 11 7 7 0 0 1 0-11z" fill="#FF5F00" />
          </svg>
        </IconShell>
      )
    case "paypal":
      return (
        <IconShell label="PayPal">
          <svg viewBox="0 0 48 24" className="h-5 w-10" aria-hidden>
            <rect width="48" height="24" rx="3" fill="#003087" />
            <text x="7" y="15.5" fill="#fff" fontSize="8" fontWeight="700" fontFamily="Arial">
              Pay
            </text>
            <text x="24" y="15.5" fill="#009CDE" fontSize="8" fontWeight="700" fontFamily="Arial">
              Pal
            </text>
          </svg>
        </IconShell>
      )
    case "bancontact":
      return (
        <IconShell label="Bancontact">
          <svg viewBox="0 0 48 24" className="h-5 w-10" aria-hidden>
            <rect width="48" height="24" rx="3" fill="#005498" />
            <text x="5" y="15" fill="#fff" fontSize="7" fontWeight="700" fontFamily="Arial">
              Bancontact
            </text>
          </svg>
        </IconShell>
      )
    case "applepay":
      return (
        <IconShell label="Apple Pay">
          <svg viewBox="0 0 48 24" className="h-5 w-10" aria-hidden>
            <rect width="48" height="24" rx="3" fill="#000" />
            <text x="6" y="15.5" fill="#fff" fontSize="8" fontWeight="600" fontFamily="Arial">
              Pay
            </text>
          </svg>
        </IconShell>
      )
    case "googlepay":
      return (
        <IconShell label="Google Pay">
          <svg viewBox="0 0 48 24" className="h-5 w-10" aria-hidden>
            <rect width="48" height="24" rx="3" fill="#fff" stroke="#DADCE0" />
            <text x="5" y="15.5" fill="#3C4043" fontSize="7.5" fontWeight="700" fontFamily="Arial">
              GPay
            </text>
          </svg>
        </IconShell>
      )
  }
}
