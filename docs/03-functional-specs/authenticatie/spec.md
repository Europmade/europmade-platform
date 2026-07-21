# EuropMade — Authenticatie-flow: Architectuuranalyse & UX-specificatie

**Status:** v1.1 — **definitief bevroren.** Derde onderdeel van Sprint 1B (na Winkelwagen en Orderbevestiging, beide eveneens bevroren).
**Basis:** Blueprint v2.1, UX-architectuur (schermen #9, #10; rollenmatrix), Design System (41 componenten, definitief), Winkelwagen-spec (bevroren, sectie 5A — Guest Cart Merge), Checkout-spec (bevroren, sectie 3 — gast/account), ADR 0001–0005.
**Nadrukkelijk:** Homepage, Categorie, Zoekresultaten, Productpagina, Winkelwagen, Checkout en Orderbevestiging zijn allemaal bevroren en worden door dit document niet gewijzigd.

---

## Stap 1 — Architectuuranalyse

### 1.1 Eén registratieflow — kernbeslissing, expliciet vastgelegd

**Iedereen registreert zich eerst als consument.** Er bestaat precies één registratiescherm, zonder rolkeuze. Retailer- of producentschap wordt **niet** via dit scherm verkregen, maar via een aparte, latere onboarding-flow (schermen #26–28, inmiddels gebouwd en bevroren — zie `partner-onboarding/spec.md`) die een bestaand, ingelogd account uitbreidt met een Partner-rol. Dit is consistent met de al vastgelegde UX-architectuur-bevinding dat rollen combineerbaar zijn (H9.3: "een producent kan ook retailer zijn") — rollen zijn **aanvullende bevoegdheden op één identiteit**, geen aparte accounttypes.

### 1.2 Inloggen

- Velden: e-mailadres, wachtwoord.
- Bij succes: sessie aangemaakt, **Guest Cart Merge wordt getriggerd** (zie 1.8) vóórdat de gebruiker wordt doorgestuurd, en de gebruiker keert terug naar waar hij vandaan kwam (bijv. Checkout Stap 0, als inloggen daar werd gestart — al vastgelegd in `checkout/spec.md` sectie 3) of naar de accountpagina.
- Bij mislukking: generieke foutmelding ("E-mailadres of wachtwoord onjuist") — **nooit** aangeven welk van de twee specifiek fout is (voorkomt dat een aanvaller kan testen welke e-mailadressen bestaan).

### 1.3 Registreren

- Velden: naam, e-mailadres, wachtwoord, akkoord met voorwaarden/privacybeleid (verplichte checkbox).
- Bij succes: account **direct aangemaakt en direct bruikbaar** (kan meteen inloggen/winkelen) — **e-mailverificatie blokkeert het winkelen niet** (consistent met het feit dat zelfs een gast zonder enig account al kan afrekenen, sectie 1.6). Wél doorgestuurd naar "Controleer je e-mail".
- Bestaat het e-mailadres al? → foutmelding met directe "Inloggen"-link (zelfde patroon als al vastgelegd voor de Checkout-gastflow, `checkout/spec.md` sectie 3: "melding met directe Inloggen-optie zonder de winkelwagen te verliezen").

### 1.4 E-mailadres verifiëren

- Verificatielink in de registratie-e-mail, tijdgebonden geldig.
- Klikken op de link → "E-mailadres bevestigd"-scherm.
- **Architecturale regel, hier vastgesteld:** verificatie is **niet blokkerend voor winkelen**, maar **wél verplicht vóórdat de Partner Onboarding-flow (retailer/producent worden) kan starten** — een logische vertrouwensdrempel: iemand die zelf nog geen bevestigd e-mailadres heeft, kan nog geen verkoper worden. **Waar deze regel wordt afgedwongen (bijgewerkt na de architectuurreview op Partner Onboarding):** zie `partner-onboarding/spec.md` sectie 1.8 — server-side controle vóór de "Partner kiezen"-stap, met een gerichte melding bij ontbrekende verificatie.

### 1.5 Wachtwoord vergeten / Nieuw wachtwoord instellen

- "Wachtwoord vergeten" vraagt uitsluitend een e-mailadres, toont vervolgens **altijd** "Controleer je e-mail" — ongeacht of het adres daadwerkelijk bestaat (voorkomt dat een aanvaller kan testen welke e-mailadressen geregistreerd zijn, zelfde beveiligingsprincipe als 1.2).
- Resetlink → "Nieuw wachtwoord instellen" (nieuw wachtwoord + bevestiging), tijdgebonden geldige token.
- Na succesvolle wachtwoordwijziging: **alle bestaande sessies van dat account worden serverzijdig beëindigd** (voorkomt dat een aanvaller die het oude wachtwoord kende, via een nog actieve sessie toegang houdt) — nieuwe login vereist.

### 1.6 Uitloggen

Geen apart scherm (niet in de gevraagde schermenlijst) — een directe actie vanuit de Header/accountmenu: serverzijdige sessie-invalidatie, redirect naar Homepage. Gedocumenteerd hier voor volledigheid, geen wireframe nodig.

### 1.7 Sessiebeheer

- Standaard Medusa Customer-sessie (token-/cookiegebaseerd).
- "Onthoud mij" (Inloggen) verlengt de sessieduur — geen aparte infrastructuur, een standaard sessie-vervalinstelling.
- Sessie-validatie gebeurt **altijd server-side** bij elke gevoelige actie (bestellen, accountgegevens wijzigen, Partner Onboarding starten) — nooit uitsluitend een client-side aanname dat iemand "ingelogd is" (zelfde ADR 0005-filosofie, hier toegepast op sessies in plaats van Buy Box-berekening).

### 1.8 Guest Cart Merge — hergebruikt, niet opnieuw gespecificeerd

**Volledig al vastgelegd in `winkelwagen/spec.md` sectie 5A.** Dit document voegt uitsluitend het **triggermoment** toe: de merge wordt uitgevoerd direct na een succesvolle **Inloggen**-actie (niet na Registreren — een nieuw account heeft per definitie nog geen eigen bestaande winkelwagen om mee samen te voegen). Geen enkele regel uit sectie 5A wordt hier herhaald of gewijzigd.

### 1.9 Rollen

| Rol | Aard | Verkregen via |
|---|---|---|
| Bezoeker | Niet-geauthenticeerd | N.v.t. (geen account) |
| **Consument** | Basis-identiteit, via dit document | Dit registratiescherm — de enige poort |
| **Retailer** | Aanvullende bevoegdheid op een bestaand Consument-account | Partner Onboarding (schermen #26–28, **niet in deze scope, inmiddels apart bevroren**) |
| **Producent** | Aanvullende bevoegdheid op een bestaand Consument-account | Partner Onboarding (schermen #26–28, **niet in deze scope, inmiddels apart bevroren**) — combineerbaar met Retailer (H9.3) |
| **Beheerder** | Volledig gescheiden identiteit | **Niet via dit registratiescherm** — Medusa Admin, apart authenticatiesysteem (bevestigd in `ux-architecture.md`: "Medusa Admin als basis voor de Administrator-rol") |

**Affiliate/Creator** zijn Post-MVP (functional-specs README, coverage-matrix) en daarom bewust buiten deze scope gehouden.

### 1.10 RBAC (Role-Based Access Control)

- Autorisatie wordt **altijd server-side afgedwongen**, nooit uitsluitend via het al dan niet tonen van een knop in de UI (dezelfde regel als 1.7, toegepast op rolcontrole in plaats van sessiecontrole).
- De UI **past zich wel aan** de rol aan (bijv. een account met de Retailer-rol ziet een extra "Partnerdashboard"-link in het accountmenu die een pure Consument niet ziet) — dit is een gebruiksvriendelijkheidsmaatregel, geen beveiligingsmaatregel; de daadwerkelijke toegangscontrole gebeurt altijd op de server.
- Rollen zijn **niet-exclusief en optelbaar**: één account kan tegelijk Consument + Retailer + Producent zijn.

### 1.11 Medusa-standaard versus maatwerk

| Onderdeel | Bouwaard |
|---|---|
| Inloggen, Registreren, Wachtwoord-reset (basismechaniek) | **Standaard Medusa Customer-authenticatie.** |
| Sessiebeheer (token/cookie, "onthoud mij") | Standaard. |
| E-mailverificatie (verplichte stap vóór Partner Onboarding) | **Kleine maatwerktoevoeging** — Medusa's kernmodule verplicht e-mailverificatie niet standaard; dit is een klein, aantoonbaar noodzakelijk extra veld/statusvlag op het Customer-record, geen nieuwe architectuur. |
| Guest Cart Merge | **Maatwerk**, al vastgelegd (`winkelwagen/spec.md` sectie 5A) — hier uitsluitend het triggermoment toegevoegd. |
| Retailer-/Producent-rol (Partner-laag) | **Maatwerk**, hoort bij de nog te bouwen Partnerplatform-architectuur (schermen #26–36) — dit document introduceert de rol-toewijzingslogica niet, uitsluitend de plek waar ze later aan een bestaand account gekoppeld wordt. |
| Beheerder-authenticatie | **Standaard Medusa Admin**, volledig gescheiden systeem, buiten deze scope. |

---

## Stap 2 — Componentanalyse

| Behoefte | Bestaand component? | Conclusie |
|---|---|---|
| E-mail/wachtwoordvelden | CMP-006 (Form Field) | Hergebruik. |
| Akkoord-/onthoud-mij-checkbox | CMP-007 (Checkbox) | Hergebruik. |
| Primaire acties (Inloggen, Account aanmaken, Wachtwoord opslaan) | CMP-005 (Button) | Hergebruik. |
| Foutmeldingen, statusmeldingen | CMP-011 (Notice) | Hergebruik. |
| Succesbevestiging ("E-mailadres bevestigd") | Geen los component — compositie | Hergebruikt exact hetzelfde composittiepatroon als de Orderbevestiging-succesmelding (grote iconenglyph + kop + tekst, CMP-005/CMP-011/typografie) — geen nieuw component, tweede toepassing van hetzelfde patroon. |
| "Controleer je e-mail"-tussenscherm | Geen los component — compositie | Zelfde compositiepatroon, andere iconenglyph (envelop i.p.v. vinkje) en tekst. |
| Gecentreerde formulierkaart | Geen los component | Hergebruikt de al bestaande visuele conventie (rand + afronding + padding, zoals `.buybox`/`.summary-box` elders) — een stylingconventie, geen apart component. |
| Header/Footer | CMP-001/CMP-002 | Hergebruik, in de vereenvoudigde "Focused Flow"-variant die Checkout al gebruikt (geen mega-menu, geen afleidende footer-navigatie). |

**Conclusie: geen enkel nieuw component is noodzakelijk.** Zelfde uitkomst als bij de Orderbevestiging — de Sprint 1A/1B-componentenbasis blijft toereikend.

---

## Stap 3 — Functionele specificatie

### 3.1 User journeys

- *"Als bezoeker met een account wil ik snel inloggen, ook vanuit het midden van een aankoop, zonder mijn winkelwagen te verliezen."*
- *"Als nieuwe bezoeker wil ik in één, simpel scherm een account aanmaken — zonder eerst te hoeven kiezen 'ben ik een koper of verkoper', want dat weet ik op dit moment nog niet."*
- *"Als klant die zijn wachtwoord vergeten is wil ik dit zelfstandig kunnen herstellen, zonder klantenservice te hoeven bellen."*

### 3.2 Edge cases

- **Registreren met een reeds bestaand e-mailadres** → directe foutmelding + "Inloggen"-link (sectie 1.3).
- **Verificatielink verlopen** → duidelijke melding + "Nieuwe link versturen"-actie, geen doodlopende pagina.
- **Reset-token verlopen of al gebruikt** → zelfde soort melding, terug naar "Wachtwoord vergeten".
- **Inloggen met een niet-geverifieerd account** → toegestaan (sectie 1.3) — geen blokkade, wel een niet-opdringerige Notice die aanraadt het e-mailadres alsnog te bevestigen.
- **Guest met een gevulde winkelwagen logt in tijdens Checkout** → Guest Cart Merge (sectie 1.8), daarna terug naar Checkout met de samengevoegde winkelwagen — geen verlies van de net ingevoerde checkoutgegevens waar dat vermijdbaar is.
- **Dubbele verificatielink-klik** (klant klikt twee keer, bijv. via e-mailclient-preview) → tweede klik toont gewoon "E-mailadres bevestigd" opnieuw, geen foutmelding voor een al-geverifieerd account.

### 3.3 Validaties

- E-mailadres: standaard formaatvalidatie, server-side herbevestigd (nooit uitsluitend client-side).
- Wachtwoord: minimale sterkte-eis (bijv. minimaal 8 tekens) — exacte beleidsregels zijn een implementatiedetail, buiten UX-scope, wel een zichtbare hint bij het invoerveld.
- Wachtwoord bevestigen (Registreren, Nieuw wachtwoord): moet exact overeenkomen, directe inline validatie.
- Verplichte akkoord-checkbox (Registreren): registratie geblokkeerd totdat aangevinkt.

### 3.4 Acceptatiecriteria

- [ ] Er bestaat precies één registratiescherm, zonder rolkeuze.
- [ ] Een succesvolle registratie maakt het account direct bruikbaar (inloggen/winkelen), zonder te wachten op e-mailverificatie.
- [ ] Verificatie blokkeert niet het winkelen, wél het starten van Partner Onboarding.
- [ ] Een mislukte inlogpoging toont een generieke foutmelding, nooit specifiek "e-mailadres onbekend" of "wachtwoord onjuist" apart.
- [ ] "Wachtwoord vergeten" toont altijd hetzelfde vervolgscherm, ongeacht of het adres bestaat.
- [ ] Een succesvolle wachtwoordwijziging beëindigt alle bestaande sessies van dat account.
- [ ] Guest Cart Merge wordt uitsluitend getriggerd door Inloggen, nooit door Registreren.
- [ ] Alle autorisatiecontroles zijn server-side; de UI past zich alleen cosmetisch aan de rol aan.

### 3.5 API-afhankelijkheden

Customer-authenticatie-API (login/register/token-uitgifte), wachtwoord-reset-API (token-aanmaak + validatie), e-mailverificatie-API (token-aanmaak + validatie), sessie-invalidatie-API (bij wachtwoordwijziging/uitloggen), Guest Cart Merge-API (al vastgelegd, hergebruikt), notificatie-/e-mailservice (verificatie- en resetmails).

### 3.6 Blueprint-consistentie

De Blueprint besteedt geen apart hoofdstuk aan authenticatie (bevestigd bij architectuuranalyse, sectie 0 hierboven — dit is, net als bij de Winkelwagen, "impliciet vereist, niet apart benoemd", exact zoals `ux-architecture.md` zelf al aangeeft voor schermen #9/#10). De rolstructuur (Consument als basis, Retailer/Producent als aanvullende, combineerbare bevoegdheid) is direct herleidbaar naar H9.3. De volledige scheiding tussen Beheerder-authenticatie (Medusa Admin) en de overige rollen is al vastgelegd in de UX-architectuur-review.

---

## Stap 2A — Componentanalyse 2FA

| Behoefte | Bestaand component? | Conclusie |
|---|---|---|
| 6-cijferige code invoeren (setup-bevestiging én login-stap) | **Geen bestaand component dekt dit** — CMP-006 (Form Field) is één enkel tekstveld, geen gesegmenteerde numerieke code-invoer met auto-advance/plak-ondersteuning | **Nieuw: CMP-040 Code Input (OTP)** |
| QR-code tonen | Geen component nodig | Een gerenderde afbeelding binnen een bestaande kaartcontainer — geen herbruikbaar interactiepatroon, geen component. |
| Herstelcodes tonen | Geen component nodig | Hergebruikt de bestaande kaart-/notice-stijlconventie (zelfde rand/afronding-patroon als `.auth-card`/`.notice`), gewoon tekst in een lijst. |
| "Vertrouw dit apparaat"-keuze | CMP-007 (Checkbox) | Hergebruik. |
| Inschakelen/uitschakelen-acties (Mijn Account) | CMP-005 (Button) | Hergebruik. |

**Conclusie: precies één nieuw component is aantoonbaar noodzakelijk** — CMP-040 wordt op twee concrete plekken binnen dezelfde flow gebruikt (setup-bevestiging, login-stap), wat het een echt herbruikbaar patroon maakt, geen eenmalige losse oplossing.

### CMP-040 — Code Input (OTP)

| Aspect | Beschrijving |
|---|---|
| Doel | Een numerieke, meestal 6-cijferige, eenmalige verificatiecode laten invoeren (TOTP-authenticator-app of herstelcode-context). |
| Varianten | Standaard (6 losse invakken). |
| Interacties | Automatisch doorspringen naar het volgende vak bij invoer; automatisch terugspringen bij backspace op een leeg vak; **plak-ondersteuning** — een volledige 6-cijferige code plakken vult automatisch alle vakken. |
| Toegankelijkheid | Elk vak een eigen `<input inputmode="numeric" maxlength="1">`, gezamenlijk omvat door een `<fieldset>` met `<legend>` ("Verificatiecode"); duidelijke focus-indicator per vak. |
| Bouwaard | Standaard bouwpatroon (geen maatwerk-datakoppeling nodig — de code zelf wordt pas bij het versturen serverzijdig gevalideerd, zelfde ADR 0005-principe als overal elders). |
| Afhankelijkheden | Geen. |
| Eerst toegepast in | Authenticatie-flow: 2FA-setup-bevestiging, 2FA-login-stap. |

Vastgelegd in het Design System vóórdat de wireframes zijn uitgebreid, conform de gevraagde volgorde.

---

## Stap 3A — Two-Factor Authentication (2FA): volledige strategie

### Uitgangspunten per rol (bevestigd)

| Rol | 2FA-status | Toegangsgevolg |
|---|---|---|
| Consument | **Optioneel**, actief gestimuleerd | Geen blokkade — winkelen blijft altijd mogelijk zonder 2FA. |
| Retailer | **Verplicht** | Geen toegang tot het Retailer Dashboard zonder actieve 2FA. |
| Producent | **Verplicht** | Geen toegang tot het Producent Dashboard zonder actieve 2FA. |
| Beheerder | **Verplicht** | Aparte infrastructuur (Medusa Admin, sectie 1.9) — zelfde UX-principes, technisch gescheiden implementatie. |

### Methode

**TOTP (Time-based One-Time Password) via een authenticator-app** (bijv. Google Authenticator, Authy, 1Password) is de primaire, enige methode voor de MVP — geen sms-gebaseerde 2FA (voorkomt sms-kosten en het bekende sim-swap-beveiligingsrisico van sms-2FA). **Architecturale voorbereiding voor Beheerders:** de opslag van 2FA-credentials wordt **methode-onafhankelijk** ontworpen (een credential-record met een `type`-veld: `totp` nu, `webauthn`/`passkey`/`hardware_key` als toekomstige waarden) — zodat passkeys/hardware security keys later toegevoegd kunnen worden **zonder herontwerp van het datamodel**, uitsluitend een nieuwe credential-type-implementatie. Dit is voor de MVP uitsluitend een datamodel-voorbereiding, geen functionele implementatie van passkeys zelf.

### User journey — activatie (Consument, optioneel)

1. Vanuit "Mijn Account" → sectie "Beveiliging" → knop "Tweestapsverificatie inschakelen".
2. Scherm toont een QR-code + handmatige code (voor wie geen camera kan gebruiken).
3. Gebruiker scant met een authenticator-app.
4. Gebruiker voert de eerste gegenereerde 6-cijferige code in (CMP-040) ter bevestiging dat de koppeling werkt.
5. Bij een geldige code: **herstelcodes worden getoond** (sectie hieronder) — gebruiker moet een checkbox aanvinken ("Ik heb deze codes veilig bewaard") vóórdat hij verder kan.
6. 2FA is actief.

### User journey — activatie (Retailer/Producent, verplicht)

- **Trigger:** direct na het voltooien van Partner Onboarding (schermen #26–28, inmiddels apart bevroren), of bij een volgend bezoek aan het Dashboard door een account dat de Partner-rol al had vóórdat 2FA verplicht werd.
- Zelfde technische stappen als hierboven (1–6), met een aangepaste, niet-overslaanbare framing: **"Tweestapsverificatie is verplicht voor toegang tot je Dashboard"** — geen "later"-knop, geen sluit-icoon dat de stap overslaat.
- Zolang dit niet is afgerond: elke poging het Dashboard te openen leidt terug naar dit verplichte instelscherm — **server-side afgedwongen** (route-/API-niveau controle, nooit uitsluitend het verbergen van een link in de UI — zelfde ADR 0005-principe als bij RBAC, sectie 1.10).

### Activatieproces — technisch

- Server genereert een TOTP-secret, gekoppeld aan het account, nog **niet actief** totdat stap 4 (bevestigingscode) slaagt — voorkomt dat een mislukte/afgebroken setup het account per ongeluk in een halfslachtige staat achterlaat.
- Bij een ongeldige bevestigingscode: nieuwe poging toegestaan, geen limiet nodig voor deze stap (wél voor de eigenlijke login-stap, zie Edge cases).

### Herstelcodes

- **8–10 eenmalig bruikbare herstelcodes**, getoond exact één keer bij activatie (niet later opnieuw op te vragen in leesbare vorm — alleen opnieuw te **genereren**, wat de oude set ongeldig maakt).
- Elke code is precies één keer bruikbaar; na gebruik automatisch gemarkeerd als verbruikt.
- Kunnen tijdens het inloggen worden gebruikt **in plaats van** een TOTP-code, voor het geval het apparaat met de authenticator-app niet beschikbaar is.
- **Waarschuwing bij een laag aantal resterende codes** (bijv. nog 2 over) — aanbeveling om een nieuwe set te genereren, geen blokkade.
- Regenereren vereist een geldige, actieve sessie + herbevestiging (wachtwoord of een geldige 2FA-code) — voorkomt dat een tijdelijk overgenomen sessie zomaar een nieuwe herstelcodeset kan claimen.

### Verloren apparaat

- **Met herstelcodes nog beschikbaar:** inloggen met e-mail/wachtwoord + één herstelcode in plaats van een TOTP-code → daarna aanbevolen (niet verplicht) om direct een nieuw apparaat te koppelen (volgende sectie).
- **Zonder herstelcodes beschikbaar (apparaat én codes kwijt):** **geen volledig zelfbedieningspad** — dit vereist een handmatig, door Klantenservice begeleid identiteitsverificatieproces vóórdat 2FA op het account gereset wordt. Dit is een **bewuste beveiligingskeuze**, geen ontwerptekortkoming: een volledig geautomatiseerd "2FA resetten zonder enig bewijs" zou de hele beveiligingswaarde van 2FA ondermijnen.
- **Impact voor Retailer/Producent:** zolang dit scenario niet is opgelost, blijft het Dashboard ontoegankelijk — een reëel bedrijfscontinuïteitsrisico dat hier bewust benoemd wordt (zie Edge cases) zodat het bij de bouw van de Klantenservice-/Berichtencentrum-schermen (Sprint 2) wordt meegenomen als een te ondersteunen proces.

### Nieuw apparaat koppelen

- Vanuit "Mijn Account" → Beveiliging → "Tweestapsverificatie opnieuw instellen", **uitsluitend bereikbaar vanuit een reeds ingelogde, actieve sessie** met herbevestiging (wachtwoord + huidige 2FA-code, indien nog beschikbaar — anders via het Verloren-apparaat-pad hierboven).
- Genereert een nieuwe QR-code/secret; **de oude koppeling wordt direct ongeldig** zodra de nieuwe is bevestigd — nooit twee gelijktijdig actieve TOTP-secrets (MVP-scopekeuze, expliciet vastgelegd: één actieve authenticator-koppeling per account, meerdere gelijktijdige koppelingen is een mogelijke toekomstige uitbreiding, geen huidige beperking die opgelost moet worden).

### Sessiebeheer (uitbreiding op sectie 1.7)

- 2FA-verificatie wordt **eenmalig per nieuwe sessie/apparaat** gevraagd, niet bij elke individuele actie.
- **"Vertrouw dit apparaat" (optioneel, tijdgebonden, bijv. 30 dagen):** slaat een apparaat-specifiek token op zodat een bekend apparaat de 2FA-stap tijdelijk mag overslaan bij een nieuwe login — vermindert wrijving voor herhaalbezoekers zonder de beveiligingswaarde structureel te verzwakken (na het verlopen van de termijn is de stap weer verplicht).
- **Wachtwoordwijziging** (al vastgelegd, sectie 1.5) blijft alle sessies beëindigen — **uitgebreid met de regel dat dit ook elk "vertrouwd apparaat"-token intrekt**, zodat een wachtwoordwijziging na een vermoede compromittering ook de 2FA-omzeiling via een vertrouwd apparaat teniet doet.
- **Het in-/uitschakelen of opnieuw instellen van 2FA zelf** volgt dezelfde regel: alle overige sessies worden beëindigd — een wijziging aan de beveiligingsinstellingen van een account mag nooit stilzwijgend doorwerken in een sessie die de gebruiker zelf niet ziet.

### Edge cases

- **Retailer/Producent probeert 2FA uit te schakelen** → **niet toegestaan**, de UI biedt voor deze rollen geen "uitschakelen"-optie (server-side eveneens geblokkeerd, nooit uitsluitend een verborgen knop).
- **Consument met actieve 2FA wordt later Retailer/Producent** (via Partner Onboarding) → al compliant, geen actie nodig, het verplichte activatiescherm wordt overgeslagen.
- **Herhaaldelijk foutieve 2FA-code bij het inloggen** → rate-limiting na een aantal pogingen (implementatiedetail qua exact aantal, buiten UX-scope), voorkomt bruteforcen van de 6-cijferige code.
- **Apparaat/klok loopt uit sync** (TOTP is tijdgebonden) → standaard TOTP-implementaties accepteren een kleine tijdmarge; een technisch detail, geen UX-beslissing.
- **Bestaande Retailer/Producent zonder 2FA op het moment dat dit verplicht wordt** → geen retroactieve uitlogging, wél een blokkade op de eerstvolgende Dashboard-poging totdat 2FA is ingesteld (al vastgelegd hierboven bij "activatie, verplicht").
- **Twee tabbladen, één schakelt 2FA in tijdens de sessie van het andere** → het andere tabblad krijgt bij de eerstvolgende serverinteractie de actuele staat (zelfde "server is de waarheid"-principe als eerder vastgelegd bij prijs-/voorraadwijzigingen in de Winkelwagen-spec).

### Acceptatiecriteria

- [ ] Consument kan 2FA vanuit "Mijn Account" activeren; nooit verplicht om te winkelen of af te rekenen.
- [ ] Retailer/Producent kan het Dashboard niet bereiken zonder actieve 2FA — server-side afgedwongen.
- [ ] Herstelcodes worden precies één keer getoond, zijn daarna nooit meer in leesbare vorm op te vragen (uitsluitend te regenereren).
- [ ] Elke herstelcode is precies één keer bruikbaar.
- [ ] Een nieuw gekoppeld apparaat maakt de oude koppeling direct ongeldig.
- [ ] Wachtwoordwijziging én elke 2FA-wijziging beëindigen alle overige sessies en vertrouwde-apparaat-tokens.
- [ ] Retailer/Producent kan 2FA niet uitschakelen zolang die rol actief is.
- [ ] Het 2FA-credentialmodel is methode-onafhankelijk opgezet (voorbereid op passkeys/hardware keys), zonder dat passkeys zelf al functioneel geïmplementeerd worden.

### Medusa-standaard versus maatwerk

| Onderdeel | Bouwaard |
|---|---|
| TOTP-generatie/-validatie | **Maatwerk** — geen standaard Medusa-functionaliteit; gebruikt een gangbare, standaard TOTP-bibliotheek (RFC 6238), geen zelfgebouwde cryptografie. |
| Herstelcodes (aanmaak/verbruik/regeneratie) | **Maatwerk.** |
| "Vertrouw dit apparaat"-token | **Maatwerk**, bouwt voort op de standaard Medusa-sessie-infrastructuur (sectie 1.7). |
| Dashboard-toegangsblokkade zonder 2FA (Retailer/Producent) | **Maatwerk** — hoort bij de nog te bouwen Partnerplatform-/RBAC-laag (sectie 1.11), dezelfde plek waar de rol-toewijzing zelf ook maatwerk is. |
| Beheerder-2FA | Technisch gescheiden van de Consument/Retailer/Producent-implementatie (Medusa Admin, sectie 1.9) — mogelijk een eigen, aparte Medusa Admin-2FA-voorziening indien beschikbaar, anders eveneens maatwerk binnen die aparte omgeving. |
| Credential-datamodel (methode-onafhankelijk, sectie "Methode") | **Maatwerk**, bewust generiek ontworpen voor toekomstige uitbreiding. |

---

## Stap 4 — Wireframes

Zie [`02-ux/wireframes/sprint-1b/03-authenticatie-desktop.html`](../../02-ux/wireframes/sprint-1b/03-authenticatie-desktop.html), `-tablet.html`, `-mobile.html` — elk bestand toont acht schermen binnen één bestand (zelfde aanpak als eerder bij Checkout): de oorspronkelijke zes (Inloggen, Registreren, Wachtwoord vergeten, Nieuw wachtwoord instellen, Controleer je e-mail, E-mailadres bevestigd), aangevuld met twee nieuwe 2FA-schermen (Tweestapsverificatie instellen, Inloggen met 2FA-code) die CMP-040 (Code Input) demonstreren.

---

## Stap 6 — Eindcontrole

- ✓ **Blueprint-consistent** (sectie 3.6).
- ✓ **Design System-consistent** — één nieuw, aantoonbaar noodzakelijk component (CMP-040 Code Input), vooraf vastgelegd conform de gevraagde volgorde; twee schermen hergebruiken het Orderbevestiging-succescompositiepatroon.
- ✓ **Medusa-first** — login/registratie/wachtwoordherstel volledig standaard; maatwerk beperkt tot de e-mailverificatie-statusvlag, Guest Cart Merge (elders vastgelegd), en de 2FA-laag (TOTP-generatie/-validatie, herstelcodes, vertrouwde-apparaat-tokens, Dashboard-toegangsblokkade) — bewust methode-onafhankelijk ontworpen voor toekomstige passkey-/hardware-key-ondersteuning.
- ✓ **Geen wijzigingen aan bevroren schermen** — Homepage, Categorie, Zoekresultaten, Productpagina, Winkelwagen, Checkout, Orderbevestiging ongewijzigd (geen bestandswijziging). De Authenticatie-flow zelf is nog niet bevroren, dus deze uitbreiding is toegestaan.
- ✓ **Developer-ready** — elke sectie herleidbaar naar een concreet component, databron of servicelaag (Stap 1, 2A, 3.5, 3A).

---

## Status: v1.1 — definitief bevroren

Architectuuranalyse, componentanalyse (één nieuw, aantoonbaar noodzakelijk component: CMP-040), volledige UX-specificatie, de volledige 2FA-strategie (Stap 3A) en wireframes zijn opgeleverd. **De volledige Authenticatie-flow, inclusief 2FA, is hierbij definitief bevroren.**
