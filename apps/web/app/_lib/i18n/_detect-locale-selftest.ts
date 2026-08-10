import {
  detectLocaleFromAcceptLanguage,
  detectLocaleFromNavigator,
  resolveStorefrontLocale,
} from "./detect-locale"

function assertEq(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) {
    console.error(
      `FAIL ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`
    )
    process.exitCode = 1
  } else {
    console.log(`OK   ${label}`)
  }
}

assertEq(
  resolveStorefrontLocale({ acceptLanguage: "nl-NL,nl;q=0.9,en;q=0.8" }),
  "nl",
  "A nl-NL"
)
assertEq(
  resolveStorefrontLocale({ acceptLanguage: "en-US,en;q=0.9" }),
  "en",
  "B en-US"
)
assertEq(
  resolveStorefrontLocale({ acceptLanguage: "de-DE,de;q=0.9" }),
  "de",
  "C de-DE"
)
assertEq(
  resolveStorefrontLocale({ acceptLanguage: "fr-FR,fr;q=0.9" }),
  "fr",
  "D fr-FR"
)
assertEq(
  resolveStorefrontLocale({ acceptLanguage: "es-ES,es;q=0.9" }),
  "nl",
  "E es-ES → nl"
)

assertEq(
  resolveStorefrontLocale({
    cookieValue: "nl",
    acceptLanguage: "en-US,en;q=0.9",
  }),
  "nl",
  "F cookie nl + Accept en → nl"
)
assertEq(
  resolveStorefrontLocale({
    cookieValue: "en",
    acceptLanguage: "nl-NL,nl;q=0.9",
  }),
  "en",
  "G cookie en + Accept nl → en"
)

assertEq(
  resolveStorefrontLocale({
    storedPreference: "en",
    cookieValue: "nl",
    acceptLanguage: "de-DE",
  }),
  "en",
  "H manual en > cookie nl > Accept de"
)

assertEq(
  resolveStorefrontLocale({
    cookieValue: "xx",
    acceptLanguage: "en-GB,en;q=0.8",
  }),
  "en",
  "I invalid cookie + en-GB → en"
)

assertEq(resolveStorefrontLocale({}), "nl", "J empty → nl")
assertEq(
  resolveStorefrontLocale({ acceptLanguage: "" }),
  "nl",
  "J empty header → nl"
)

assertEq(
  detectLocaleFromAcceptLanguage("nl;q=0.5,en-US;q=0.9"),
  "en",
  "q-values prefer en"
)
assertEq(detectLocaleFromAcceptLanguage("en-GB"), "en", "en-GB → en")
assertEq(detectLocaleFromAcceptLanguage("fr-BE"), "fr", "fr-BE → fr")
assertEq(detectLocaleFromAcceptLanguage("nl-BE"), "nl", "nl-BE → nl")

assertEq(detectLocaleFromNavigator("en-US"), "en", "navigator en-US")
assertEq(detectLocaleFromNavigator("es-MX"), null, "navigator es → null")
assertEq(
  resolveStorefrontLocale({ navigatorLanguage: "de-AT" }),
  "de",
  "navigator de-AT → de"
)

console.log(
  process.exitCode ? "\nSome failures" : "\nAll detection unit checks passed"
)
