# Begrippenlijst

Consistente terminologie voor gebruik in alle documentatie, code-comments en UI-teksten.

| Term | Betekenis | Bron |
|---|---|---|
| **Product Cloud** | Centrale, gedeelde database met alle officiële productinformatie (titel, specificaties, media, documentatie). Eén record per uniek product, beheerd door producent/merkhouder. | Blueprint H7 |
| **Commerce Cloud** | Verzameling van alle commerciële gegevens (prijs, voorraad, levertijd, verzending, retour) per retailer/aanbieder, losstaand van de Product Cloud. | Blueprint H8 |
| **Offer** | Eén commercieel aanbod van één retailer voor één EAN in één land — het kernrecord van de Commerce Cloud. | Functionele spec Product Cloud/Commerce Cloud/Buy Box |
| **Buy Box** | Het mechanisme dat op een productpagina bepaalt welke aanbieder standaard getoond wordt, op basis van een transparant, configureerbaar algoritme. | Blueprint H8.5 |
| **Retailer Created** | Productstatus wanneer een retailer een product zelf heeft aangemaakt omdat er nog geen officiële Product Cloud-pagina bestond; retailer beheert dan tijdelijk zowel product- als commerciële informatie. | Blueprint H5.4, H6.10 |
| **Claim** | Het proces waarbij een producent/merkhouder een Retailer Created-product overneemt, waarna het beheer van productinformatie automatisch overgaat. | Blueprint H6.10 |
| **Verified™** | Officieel kwaliteitslabel dat aangeeft dat een productpagina gecontroleerd is en voldoet aan de kwaliteitscriteria van EuropMade — zegt niets over productkwaliteit t.o.v. andere producten. | Blueprint H13.5 |
| **Product Quality Score** | Interne, niet-publieke score die de volledigheid/kwaliteit van een productpagina meet. | Blueprint H7.10 |
| **Product Health Score** | Interne score die de actualiteit van een productpagina bewaakt (verlopen certificaten, ontbrekende vertalingen, etc.). | Blueprint H7.11 |
| **Performance Score** | Interne prestatiescore van een retailer (levertijd, annuleringen, retourpercentage, reactiesnelheid, geschillen). | Blueprint H8.10 |
| **Region** | Medusa-concept: een land met eigen valuta, belasting en verzendopties; technische basis voor de landstructuur van EuropMade. | Architectuurdocumentatie |
| **Sponsored Products** | Toekomstig (post-MVP) betaald plaatsingsmechanisme in zoekresultaten/categorieën — heeft nooit invloed op de Buy Box. | ADR 0003 |
| **GPSR** | General Product Safety Regulation — EU-regelgeving voor productveiligheid bij online verkoop. | Blueprint H13.8 |
| **DPP** | Digital Product Passport — toekomstige EU-verplichting voor digitale productpaspoorten. | Blueprint H13.10 |
