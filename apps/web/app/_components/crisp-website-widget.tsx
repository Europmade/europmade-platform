import Script from "next/script"

const CRISP_WEBSITE_ID = "f882c104-5d42-45c7-a63f-efce8374bf46"

/**
 * Crisp Free website-widget. Alleen de publieke loader, geen API.
 * next/script met een vast id laadt het blok één keer, na hydration.
 */
export function CrispWebsiteWidget() {
  return (
    <Script id="crisp-website-widget" strategy="afterInteractive">
      {`
        window.$crisp = window.$crisp || [];
        window.CRISP_WEBSITE_ID = "${CRISP_WEBSITE_ID}";
        if (!document.querySelector('script[data-crisp-widget="website"]')) {
          (function () {
            const d = document;
            const s = d.createElement("script");
            s.src = "https://client.crisp.chat/l.js";
            s.async = 1;
            s.setAttribute("data-crisp-widget", "website");
            d.getElementsByTagName("head")[0].appendChild(s);
          })();
        }
      `}
    </Script>
  )
}
