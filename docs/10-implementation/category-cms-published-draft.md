# Category CMS — Published / Draft (definitief ontwerp)

**Status:** Ontwerp (nog niet geïmplementeerd) — pre-implementation check verwerkt  
**Datum:** 2026-11-02 (bijgewerkt zelfde dag)  
**Domein:** Category CMS, Admin, Storefront  
**Bouwt voort op:** Category CMS Content Intelligence; ADR-0036 (AI offline / geen page-load AI)  
**Vervolgontwerp:** [AI Category Intelligence](./category-cms-ai-intelligence.md) (ontwerp, nog niet geïmplementeerd)  
**Visuele referentie:** [category-cms-design-and-functional-reference.md](./category-cms-design-and-functional-reference.md) is verplicht bij elke Category CMS-opdracht.  
**Non-goals in dit document:** code uitvoeren, migraties draaien, UI bouwen, commits

Dit document is de leidende specificatie voor gescheiden **gepubliceerde** en **draft**-content op categoriepagina’s.

---

## 1. Doelen

1. Gepubliceerde (live) content en conceptcontent zijn volledig gescheiden in opslag.
2. AI en handmatige edits schrijven uitsluitend naar de draft.
3. Publiceren is een expliciete, bevestigde actie.
4. Na publicatie blijft de draft bestaan en is die **inhoudelijk gelijk aan live**, met duidelijke status.
5. Publicatie van een draft die op een **oudere** liveversie is gebaseerd, wordt geblokkeerd totdat de beheerder bewust herbast.
6. Iedere succesvolle publicatie is terugvindbaar en herstelbaar zonder stille overwrite van live.

---

## 2. Architectuurprincipes

- Soft-link blijft: één `cms_category`-rij per `pc_category.slug`.
- Zelfde editorial shape voor draft en published (Content Intelligence-velden: profile, sections, top-10 refs, enz.).
- Storefront leest **alleen** `published_document`.
- Admin wisselt via versieschakelaar tussen live-weergave en draft-bewerking.
- Geen gecombineerde `PUT { document, published }` meer (huidige API is onveilig en wordt vervangen).
- Hergebruik patroon zoals merk `page_document` / `page_draft`.

---

## 3. Datamodel

### 3.1 Tabel `cms_category` (uitgebreid)

| Veld | Type | Betekenis |
|------|------|-----------|
| `id` | text PK | Bestaand (`cmsca_…`) |
| `category_slug` | text unique | Soft-link taxonomie |
| `published_document` | jsonb nullable | Live editorial; `null` = nog nooit gepubliceerd |
| `published_at` | timestamptz nullable | Laatste geslaagde publicatie |
| `published_by` | text nullable | Soft-ref admin-actor |
| `published_version` | int not null default 0 | `0` = nooit gepubliceerd; na eerste publish `1…n` |
| `published_note` | text nullable | Optionele notitie van laatste publish |
| `draft_document` | jsonb nullable | Concept; `null` = geen draft |
| `draft_updated_at` | timestamptz nullable | Laatste draft-save |
| `draft_updated_by` | text nullable | Soft-ref |
| `draft_base_version` | int nullable | `published_version` waarop draft is gebaseerd; `null` als draft zonder live-basis (eerste content) |
| `draft_revision` | int not null default 0 | Optimistic concurrency voor draft-saves |
| `draft_sync_state` | enum | Zie §4 — server-onderhouden status |
| `i18n_meta` | jsonb nullable | Ongewijzigd t.o.v. bestaand ontwerp |
| timestamps / soft-delete | | Bestaand Medusa-patroon |

Zie **§3.4 Legacy-migratie** voor de volledige, idempotente mapping van alle bestaande `document`/`published`-combinaties.

### 3.2 Enum `draft_sync_state`

| Waarde | Admin-label | Betekenis |
|--------|-------------|-----------|
| `absent` | **Geen draft** | `draft_document IS NULL` |
| `in_sync` | **Draft – gelijk aan live** | Draft bestaat en is inhoudelijk gelijk aan `published_document` (na succesvolle publish, of na edits die weer exact gelijk zijn) |
| `unpublished_changes` | **Draft – niet gepubliceerd** | Draft verschilt van live, of er is draft zonder live (`published_version = 0`) |

Afleiding / onderhoud:

- Bij **succesvolle publish**: `draft_document` blijft; inhoud = nieuwe live; `draft_base_version = published_version` (nieuw); `draft_sync_state = in_sync`.
- Bij **draft save**: als `published_document` ontbreekt → altijd `unpublished_changes`. Anders vergelijk canonieke JSON-hash van draft vs published → `in_sync` of `unpublished_changes`.
- Bij **draft delete**: `draft_sync_state = absent`, document/meta draft nullen.
- Hash-vergelijking is de bron van waarheid; enum is cache voor UI/API.

### 3.3 Tabel `cms_category_revision` (append-only)

| Veld | Betekenis |
|------|-----------|
| `id` | PK |
| `category_slug` | Index |
| `kind` | `publish` \| `restore_publish` |
| `version` | Toegekende `published_version` van díe publicatie |
| `document` | Volledige jsonb-snapshot van wat **live werd** na deze actie |
| `superseded_document` | Optioneel: snapshot van live **vóór** deze publish (voor audit) |
| `published_at` | Timestamp |
| `published_by` | Admin-actor |
| `note` | Publicatie- of herstelnotitie |
| `source` | `editor_publish` \| `restore_and_publish` |
| `restored_from_version` | Nullable; gezet bij herstel-publicatie |

Iedere succesvolle publicatie (inclusief via herstel) schrijft precies één revision-rij.

**Eerste publicatie:** ook bij `published_version` 0 → 1 wordt verplicht één revision-rij geschreven met `version = 1`, `document` = nieuwe live, `superseded_document = null`, `source = editor_publish` (of `restore_and_publish` indien van toepassing). Er mag geen “eerste publish zonder history” bestaan.

### 3.4 Legacy-migratie (idempotent, later uitvoeren)

Doel: bestaande rijen veilig overzetten zonder verlies van editorial jsonb (inclusief `bannerId`, `banner`-snapshot, USP/FAQ/SEO/intro, enz.). De migratie **kopieert** jsonb byte-voor-byte (geen reshape). Bannerbibliotheekrijen in `cms_banner` worden niet aangeraast; alleen category-documentreferenties blijven intact binnen de gekopieerde jsonb.

#### 3.4.1 Definitie “lege documentinhoud”

Een legacy `document` telt als **leeg** wanneer het `NULL` is, `{}` is, of na canonieke normalisatie geen redactionele payload heeft die afwijkt van een leeg editorial-skelet (alle localized strings leeg, `usps`/`faq` leeg, geen `bannerId`/banner-object, geen `heroImage`).  
Records mét alleen lege shells + wel een `bannerId`/banner-snapshot tellen als **niet-leeg** (bannerverwijzing moet bewaard blijven).

#### 3.4.2 Mappingmatrix (alle combinaties)

| # | Legacy `published` | Legacy `document` | Resultaat `published_*` | Resultaat `draft_*` | `draft_sync_state` |
|---|--------------------|-------------------|-------------------------|---------------------|--------------------|
| A | `true` | niet-leeg | `published_document = copy(document)`, `published_version = 1`, `published_at = updated_at` (of `now()`), `published_by = null`, `published_note = 'legacy-migration'` | `draft_document = copy(document)`, `draft_base_version = 1`, `draft_revision = 1` | `in_sync` |
| B | `true` | leeg | `published_document = copy(document)` (of `{}`), `published_version = 1`, zelfde meta als A | `draft_document = copy(...)`, `draft_base_version = 1`, `draft_revision = 1` | `in_sync` |
| C | `false` | niet-leeg | `published_document = null`, `published_version = 0`, overige published-meta null | `draft_document = copy(document)`, `draft_base_version = null`, `draft_revision = 1` | `unpublished_changes` |
| D | `false` | leeg | `published_document = null`, `published_version = 0` | `draft_document = null`, draft-meta null | `absent` |
| E | `true`/`false` | `NULL` | behandel als leeg (B of D) | | |

Rijen zonder legacy-kolommen (reeds gemigreerd): **overslaan** (zie idempotentie).

#### 3.4.3 Eerste revision bij legacy published

Voor elke rij in geval **A** of **B** (had live): schrijf één `cms_category_revision` met:

- `version = 1`
- `document = published_document`
- `superseded_document = null`
- `note = 'legacy-migration'`
- `source = editor_publish`
- `published_at` / `published_by` gelijk aan category-meta

Zo is de allereerste liveversie na cutover terugvindbaar, ook zonder dat die via de nieuwe publish-API is gegaan.

Voor geval **C/D**: geen revision (er was geen live).

#### 3.4.4 Intact houden van content

- Gehele jsonb-copy: `bannerId`, geneste `banner` (inclusief `published`-flag op banner-ref), `filterControls`, localized velden, USP/FAQ-ids — ongewijzigd.
- Geen touch van `cms_banner`, assets, of Product Cloud.
- `i18n_meta` ongewijzigd laten of 1:1 kopiëren naar hetzelfde veld.

#### 3.4.5 Idempotentie en heruitvoerbaarheid

Migratie gebruikt een marker, bijv. kolom `legacy_migrated_at timestamptz` **of** detectie “nieuwe kolommen al gevuld én legacy `document` nog aanwezig maar genegeerd”.

Regels:

1. Als `legacy_migrated_at IS NOT NULL` → no-op voor die rij.  
2. Als `published_document IS NOT NULL OR draft_document IS NOT NULL` én marker gezet → no-op.  
3. Nooit opnieuw `published_version` ophogen bij herrun.  
4. Nooit dubbele `cms_category_revision` voor `version = 1` + `note = 'legacy-migration'` (unique partial index op `(category_slug, version)` voorkomt duplicaten).  
5. Migratie draait in één transactie per batch of per rij; falen op één rij blokkeert die rij, niet stilzwijgend half-schrijven zonder rollback van die rij.

Na succesvolle productiecutover (aparte latere stap): legacy kolommen `document` / `published` droppen. Tot die tijd: write-path van nieuwe API raakt legacy kolommen niet meer; optionele sync-trigger is **niet** gewenst (voorkomt drift).

#### 3.4.6 Storefront tijdens/na migratie

Tot store-route omgezet is: tijdelijke read-compat (één release):  
`published_document ?? (published ? document : null)`.  
Na omzetting: alleen `published_document`. Compat-laag verwijderen in dezelfde epic als legacy-drop.

---

## 4. Statusmodel (Admin-weergave)

De Admin-interface onderscheidt altijd:

| Status | Voorwaarde |
|--------|------------|
| **Gepubliceerd** | Er is een `published_document` (`published_version ≥ 1`). Dit is de liveversie (eigen schakelaarstand). |
| **Draft – gelijk aan live** | `draft_sync_state = in_sync` |
| **Draft – niet gepubliceerd** | `draft_sync_state = unpublished_changes` |
| **Geen draft** | `draft_sync_state = absent` |

Aanvullende badges:

- Live: `Live v{published_version}` · `{published_at}` · actor.
- Draft: `Basis v{draft_base_version}` · `rev {draft_revision}`.
- Waarschuwing **Verouderde basis** als `draft_document` bestaat en `draft_base_version ≠ published_version` (en `published_version > 0`).

---

## 5. Versieschakelaar (Admin)

Op `/cms/categories/[slug]`:

```
[ Gepubliceerd ]   [ Draft ]
```

| Stand | Gedrag |
|-------|--------|
| **Gepubliceerd** | Toont `published_document` **read-only**. Geen AI. Acties: “Draft aanmaken van live”, “Versiegeschiedenis”. Preview = live payload. |
| **Draft** | Toont/bewerkt `draft_document`. AI alleen hier. Opslaan = draft-save. Publiceren = aparte actie. Preview = draft payload. |

Default bij openen:

1. Als draft bestaat → **Draft**.
2. Anders als live bestaat → **Gepubliceerd**.
3. Anders → **Draft** met CTA “Draft aanmaken” (leeg).

Draft aanmaken:

- Van live: `draft_document = copy(published_document)`, `draft_base_version = published_version`, `draft_sync_state = in_sync`, `draft_revision = 1`.
- Zonder live: leeg/default editorial (Content Intelligence defaults), `draft_base_version = null`, `draft_sync_state = unpublished_changes`.

Als er al een draft is en gebruiker opnieuw “van live” wil: bevestigingsdialog (overschrijven draft = verlies wijzigingen) — geen stille overwrite.

---

## 6. Bewerk- en opslagflow

```
Draft-modus
  → bewerken (mens of AI → alleen draft-buffer)
  → PATCH draft { document, expected_draft_revision }
  → bij success: draft_revision++, sync_state herberekend
  → published_document onaangeroerd
```

Regels:

- Draft opslaan beïnvloedt nooit live.
- Meerdere saves toegestaan.
- Optimistic locking: body bevat `expected_draft_revision`; mismatch → **409 Conflict** (twee beheerders).
- AI-generatie: alleen Draft-modus; uitsluitend draft-endpoint; nooit publish-endpoint.

---

## 7. Publicatieprocedure

### 7.1 Voorwaarden (server, hard)

Publicatie wordt **afgewezen** tenzij alle checks slagen:

1. `draft_document` aanwezig.
2. `expected_draft_revision` matcht huidige `draft_revision`.
3. **Basis-check (nieuw, hard):**  
   - Als `published_version > 0`: vereist `draft_base_version === published_version`.  
   - Bij ongelijkheid → **409 StaleDraftBase** (of equivalent), **geen** publish.
4. Optionele inhoudelijke validatie (schema/profile).
5. Expliciete `confirm: true` (+ optionele `note`).

Als `published_version = 0` (eerste publish): `draft_base_version` mag `null` of `0` zijn; na publish worden basis en sync gezet.

### 7.2 UI bij stale base

Toon duidelijk:

- Live staat op **v{published_version}** (datum, actor).
- Draft is gebaseerd op **v{draft_base_version}**.
- Publiceren is geblokkeerd.
- Primaire CTA: **Opnieuw baseren op live…** (zie §8).
- Geen automatische merge.

### 7.3 Succesvolle publish (transactie)

Alles in **één database-transactie** met row-lock. Volgorde:

1. Row-lock op `cms_category` voor slug (`SELECT … FOR UPDATE`).  
2. Herhaal checks 1–5 op gelockte staat.  
3. Bepaal `next_version = published_version + 1` (eerste publish: `0 + 1 = 1`).  
4. **Verplicht** `INSERT` in `cms_category_revision` **vóór** overwrite van live:  
   - `version = next_version`  
   - `document = draft_document` (wat live wordt)  
   - `superseded_document = published_document` (huidige live; `null` bij allereerste publish)  
   - `source`, `note`, actor, timestamps  
5. `published_document ← deep copy van draft_document`.  
6. `published_version ← next_version`.  
7. `published_at` / `published_by` / `published_note` zetten.  
8. **Draft behouden:** `draft_document` **niet** vervangen of legen (blijft inhoudelijk gelijk aan nieuwe live).  
9. `draft_base_version ← next_version`.  
10. `draft_sync_state ← in_sync`.  
11. Commit.

**Mislukte publicatie:** elke exception na lock → `ROLLBACK`. Gevolg:

- `published_document` / `published_version` ongewijzigd (bestaande live intact).  
- Geen half geschreven revision (insert zit in dezelfde transactie).  
- Draft ongewijzigd.  
- Client ontvangt fout; mag retryen zonder dataverlies.

Unique constraint `(category_slug, version)` op revisions voorkomt dubbele versienummers bij race (tweede concurrent publish faalt netjes).

### 7.4 Na publicatie — statuscyclus

| Moment | Draft-status |
|--------|----------------|
| Direct na succesvolle publish | **Draft – gelijk aan live** |
| Eerste inhoudelijke draft-wijziging (hash ≠ live) | **Draft – niet gepubliceerd** |
| Volgende succesvolle publish | Weer **Draft – gelijk aan live**; `published_version` +1; history-rij |

Admin-schakelaar **Gepubliceerd** toont altijd de actuele liveversie, onafhankelijk van draft-status.

---

## 8. Bescherming tegen verouderde drafts (rebase)

### 8.1 Detectie

`is_stale_base = draft exists ∧ published_version > 0 ∧ draft_base_version ≠ published_version`

Stale base blokkeert publish (§7.1). `draft_revision`-check blijft daarnaast gelden.

### 8.2 Actie: Opnieuw baseren op live (draftinhoud behouden)

**Geen automatische three-way merge. Geen stille overschrijving.**

Flow:

1. Beheerder opent **Opnieuw baseren op live**.  
2. Scherm toont drie kolommen/panelen (functioneel):  
   - **Huidige live (vN)** — read-only.  
   - **Huidige draft** — read-only snapshot van wat behouden blijft.  
   - **Verschil live t.o.v. oude basis** (optioneel hulppaneel): wat er op live is gekomen sinds `draft_base_version` (af te leiden uit revision history).  
3. Beheerder kan **handmatig** secties uit live naar de draft-editor kopiëren (bewuste edits). Draft-autosave volgt gewoon `draft_revision`.  
4. Pas na expliciete bevestiging:  
   **“Markeer draft als gebaseerd op live vN — ik behoud de huidige draftinhoud en accepteer dat niet-overgenomen live-wijzigingen ontbreken.”**  
5. Server: `POST .../draft/rebase` met `{ mode: "keep_draft_content", expected_draft_revision, acknowledge_unmerged_live: true }`  
   - **Invariant:** `draft_document` jsonb blijft **byte-identiek** (geen normalize/rewrite behalve wat strikt nodig is voor opslag; ontwerp: geen touch van document-kolom).  
   - Zet **alleen** `draft_base_version = published_version`.  
   - Herberekent `draft_sync_state` via hash (meestal `unpublished_changes`).  
   - Verhoogt `draft_revision`.  
   - Weigert zonder `acknowledge_unmerged_live: true` → **400**.  
   - Raakt `published_document` niet.

### 8.3 `replace_with_live` — afzonderlijke, zwaar bevestigde actie

Dit is **niet** dezelfde knop of hetzelfde defaultpad als `keep_draft_content`.

| Eis | Invulling |
|-----|-----------|
| Apart endpoint-mode | `{ mode: "replace_with_live", expected_draft_revision, confirm_destroy_draft_changes: true }` |
| Apart UI-label | bijv. **“Vervang draft door live”** — niet onder “Opnieuw baseren” als default |
| Bevestiging | Tweede dialog: expliciet typen of checkbox “Ik begrijp dat draftwijzigingen verloren gaan” |
| Server | Weigert zonder `confirm_destroy_draft_changes: true`. Daarna: `draft_document = deep copy(published_document)`, `draft_base_version = published_version`, `draft_sync_state = in_sync`, `draft_revision++`. |
| Live | Ongewijzigd |

| Actie | Effect op draft-inhoud |
|-------|------------------------|
| `keep_draft_content` | **Exact behouden**; alleen basisversie |
| `replace_with_live` | **Vervangen** door kopie van live (destructief voor draft-edits) |
| Alleen vergelijken | Geen write |

Geen server-side auto-merge van veldconflicten.

---

## 9. Versiegeschiedenis en herstel

### 9.1 Lijst

`GET .../revisions` toont per publicatie:

- Versienummer (`version`)
- Publicatiedatum (`published_at`)
- Beheerder (`published_by`)
- Notitie (`note`)
- Bron (`source`: editor vs restore)
- Eventueel `restored_from_version`

### 9.2 Bekijken

**Versie bekijken:** laadt historical `document` read-only in Admin (niet de live schakelaar overschrijven; aparte viewer/modal). Geen storefront-impact.

### 9.3 Herstellen naar Draft

1. Bevestiging.  
2. `draft_document ← revision.document`.  
3. `draft_base_version ← published_version` **actueel** (zodat publish niet meteen stale is t.o.v. huidige live — de inhoud komt uit historie, de basispointer wijst naar nu).  
   - Alternatief strikt: `draft_base_version = revision.version` forceert rebase-flow vóór publish; **voorkeursontwerp:** basis = actuele live + status `unpublished_changes`, met banner “Inhoud hersteld uit vX; controleer tegen huidige live vN”.  
4. `draft_sync_state` herberekend (vrijwel altijd `unpublished_changes`).  
5. Live **ongewijzigd**.  
6. Geen revision-rij van kind publish; optioneel audit-log “restore_to_draft” (mag lichte audit-tabel of note op category).

**Voorkeur vastgelegd:** na “Herstellen naar Draft” geldt `draft_base_version = current published_version` en zichtbare herkomstbanner `restoredFromVersion = X`, zodat publish niet onnodig geblokkeerd wordt, maar de redacteur wél ziet dat inhoud uit vX komt en live intussen vN kan zijn met andere inhoud — bij inhoudelijk conflict met “wat live nu is” lost men dat op via vergelijking, niet via auto-merge.

### 9.4 Herstellen en publiceren

1. Voert eerst **Herstellen naar Draft** uit (inhoud uit historie).  
2. Opent de **normale publicatieprocedure** (§7) met bevestiging, notitie (auto-voorinvulling: “Herstel van vX”), en alle checks.  
3. Bij succes: nieuwe `published_version`, draft `in_sync`, **nieuwe** `cms_category_revision` met `source = restore_and_publish`, `restored_from_version = X`.  
4. Nooit directe write published ← history zonder draft + confirm.

### 9.5 Verboden

- Rechtstreeks `published_document` vervangen vanuit history zonder bevestigde publish-flow.  
- Publish zonder revision-append.  
- Verwijderen van history-rijen in v1 (append-only).

---

## 10. API-ontwerp

### 10.1 Admin

| Method | Pad | Rol |
|--------|-----|-----|
| `GET` | `/admin/cms/categories/:slug` | `{ published: { document, version, at, by, note }, draft: { document, base_version, revision, sync_state, updated_at, updated_by, restored_from_version? }, stale_base: boolean }` |
| `POST` | `/admin/cms/categories/:slug/draft` | Draft aanmaken (from published \| empty) |
| `PATCH` | `/admin/cms/categories/:slug/draft` | Draft opslaan; `expected_draft_revision` verplicht |
| `DELETE` | `/admin/cms/categories/:slug/draft` | Draft verwijderen; live onaangeroerd |
| `POST` | `/admin/cms/categories/:slug/draft/rebase` | §8; modes `keep_draft_content` \| `replace_with_live` |
| `POST` | `/admin/cms/categories/:slug/publish` | `{ confirm, expected_draft_revision, note? }` — hard base-check |
| `GET` | `/admin/cms/categories/:slug/revisions` | History-lijst |
| `GET` | `/admin/cms/categories/:slug/revisions/:version` | Één snapshot bekijken |
| `POST` | `/admin/cms/categories/:slug/revisions/:version/restore-to-draft` | §9.3 |
| `POST` | `/admin/cms/categories/:slug/revisions/:version/restore-and-publish` | Start §9.4 (of client doet restore-to-draft + publish apart; server mag composite met zelfde garanties) |

**Deprecate:** `PUT /admin/cms/categories/:slug` met gecombineerde `{ document, published }`.

Foutcodes (concept):

- `409 draft_revision_conflict`
- `409 stale_draft_base` — body bevat `published_version`, `draft_base_version`
- `400 draft_missing`
- `400 publish_not_confirmed`

### 10.2 Store

| Method | Pad | Rol |
|--------|-----|-----|
| `GET` | `/store/cms/categories/:slug` | Alleen als `published_document` gezet; payload = published. Nooit draft. |

### 10.3 Preview

Bestaande `/cms-preview/category/[slug]` + `CmsLivePreview`: Admin stuurt **draft**-document (of expliciet published ter vergelijking). Geen AI op page load (ADR-0036).

---

## 11. AI-integratie

| Regel | Invulling |
|-------|-----------|
| Schrijft alleen naar draft | Generator → PATCH draft of editor-state + draft save |
| Nooit auto-publish | Jobs: `publish: false` hard; publish-endpoint niet aanroepbaar vanuit AI |
| Alleen Draft-modus in UI | Knoppen disabled op tab Gepubliceerd |
| Content Intelligence | Signals / top-10 / GPSR-uitsluiting / profielen blijven van kracht op **inhoud** van draft |
| Na AI-save | `draft_sync_state = unpublished_changes` (tenzij identiek aan live) |

---

## 12. Storefront-gevolgen

- `/categorie/[slug]` blijft `fetchStoreCmsCategory` → overlay → resolve.  
- Bron = uitsluitend `published_document`.  
- Geen gedragsänderung aan listing/Product Cloud.  
- Ontbrekende published → bestaande null/lege overlay-fallback.

---

## 13. Consistentie met Content Intelligence

| Intelligence-onderdeel | Published/Draft |
|------------------------|-----------------|
| `contentProfile`, sections, buyGuide, specHighlights, sources | Zitten in **beide** document-instanties (zelfde schema) |
| AI-voorstellen | Alleen draft |
| Top-10 / GPSR-scheiding | Validatie bij draft-save én bij publish (zelfde rules) |
| Robotstofzuiger-gap | Signals/`pathKey: null` — onafhankelijk van draft/publish |

---

## 14. Samenvatting status- en publicatiecyclus

```
[Geen draft] --aanmaken--> [Draft – niet gepubliceerd] of [Draft – gelijk aan live]
                                    |
                                 edits
                                    v
                         [Draft – niet gepubliceerd]
                                    |
                    publish (base == live version)
                                    v
                         Live v(n+1) + [Draft – gelijk aan live]
                                    |
                                 edits
                                    v
                         [Draft – niet gepubliceerd]
                                    |
                         (bij stale base: rebase verplicht)
                                    |
                                 publish
                                    v
                         Live v(n+2) + [Draft – gelijk aan live]
```

---

## 15. Pre-implementation check (2026-11-02)

### 15.1 Legacy-migratie — oordeel

| Vraag | Oordeel | Ontwerpdekking |
|-------|---------|----------------|
| Alle `document`×`published`-combinaties? | **Ja** | Matrix A–E in §3.4.2 (incl. leeg + published, leeg + unpublished, null) |
| Lege / unpublished / bestaande records? | **Ja** | D → geen draft; C → alleen draft; A/B → live + draft in sync |
| Bannerrefs + editorial intact? | **Ja** | Byte-copy jsonb; `cms_banner` onaangeroerd; bannerId/snapshot blijven in document |
| Idempotent heruitvoerbaar? | **Ja** | `legacy_migrated_at` / no-op + unique `(category_slug, version)` |

### 15.2 Versiegeschiedenis — oordeel

| Vraag | Oordeel | Ontwerpdekking |
|-------|---------|----------------|
| Eerste succesvolle publish als revision? | **Ja** | §3.3 + §7.3 stap 4 met `superseded_document = null`; legacy A/B schrijven v1-revision |
| Alle volgende + herstelpublicaties terugvindbaar? | **Ja** | Elke publish/restore-publish = één append-only rij; unique version per slug |
| Mislukte publish beschadigt live niet? | **Ja** | Eén transactie + rollback; live/draft/revision atomair |

### 15.3 Rebase — oordeel

| Vraag | Oordeel | Ontwerpdekking |
|-------|---------|----------------|
| `keep_draft_content` behoudt draft exact? | **Ja** | §8.2: geen write op `draft_document` |
| Alleen basisversie na bevestiging? | **Ja** | Vereist `acknowledge_unmerged_live`; alleen `draft_base_version` (+ revision/sync) |
| `replace_with_live` apart + bevestigd? | **Ja** | §8.3: aparte mode, apart UI-label, `confirm_destroy_draft_changes` |

---

## 16. Implementatieplan (kleine, testbare stappen)

Nog **niet uitvoeren**. Volgorde is strikt; elke stap heeft eigen acceptatiecriteria.

### Stap 0 — Voorbereiding

| | |
|--|--|
| **Doel** | Feature flag / branch; inventaris huidige `cms_category`-rijen (counts published/empty) |
| **Raakt** | Geen productcode verplicht; optioneel read-only SQL-rapport in `.tmp-verify` |
| **Depends** | — |
| **Acceptatie** | Baseline-aantallen vastgelegd (published true/false, lege docs) |

### Stap 1 — Datamodel en migratie

| | |
|--|--|
| **Doel** | Kolommen + `cms_category_revision` + idempotente backfill (§3.4) |
| **Raakt** | `apps/backend/src/modules/cms/models/cms-category.ts`, nieuw model `cms-category-revision.ts`, `models/index.ts`, nieuwe migratie onder `apps/backend/src/modules/cms/migrations/`, `service.ts` (export entities) |
| **Depends** | Stap 0 |
| **Acceptatie** | Migratie dry-run op kopie/local: matrix A–D correct; herrun no-op; jsonb (incl. banner) identiek; unique version; rollback-test op geforceerde fout |

### Stap 2 — Backend: serialize + draft CRUD

| | |
|--|--|
| **Doel** | GET met published+draft meta; POST/PATCH/DELETE draft; optimistic `draft_revision` |
| **Raakt** | `apps/backend/src/api/cms/serialize.ts`, `apps/backend/src/api/admin/cms/categories/[slug]/route.ts` (opknippen of deprecaten PUT), nieuwe routes `.../draft/route.ts`, unit tests naast bestaande cms-tests |
| **Depends** | Stap 1 |
| **Acceptatie** | Draft-save wijzigt published niet; 409 bij revision-mismatch; DELETE draft raakt live niet; sync_state correct |

### Stap 3 — Backend: publish-transactie + revisions

| | |
|--|--|
| **Doel** | `POST …/publish` atomair; eerste + volgende publish schrijven revision; stale-base 409 |
| **Raakt** | `.../publish/route.ts` (nieuw), cms service helpers, `.../revisions/route.ts` (GET list), tests voor rollback/simulatie fout na lock |
| **Depends** | Stap 2 |
| **Acceptatie** | Eerste publish → v1 + 1 revision; tweede → v2 + 2 revisions; stale base geblokkeerd; geforceerde fail → live hash ongewijzigd; draft blijft na succes `in_sync` |

### Stap 4 — Backend: rebase + restore

| | |
|--|--|
| **Doel** | `keep_draft_content` / `replace_with_live`; restore-to-draft; restore-and-publish |
| **Raakt** | `.../draft/rebase/route.ts`, `.../revisions/[version]/route.ts`, restore routes |
| **Depends** | Stap 3 |
| **Acceptatie** | keep: document hash ongewijzigd, alleen base; replace vereist confirm anders 400; restore-to-draft wijzigt live niet; restore-and-publish = nieuwe version + revision met `restored_from_version` |

### Stap 5 — Store API compatibiliteit

| | |
|--|--|
| **Doel** | Store leest `published_document`; tijdelijke fallback tijdens rollout |
| **Raakt** | `apps/backend/src/api/store/cms/categories/[slug]/route.ts`, eventueel serialize |
| **Depends** | Stap 1 (minimaal); idealiter na Stap 3 |
| **Acceptatie** | Published slug → 200 met document; unpublished/null → `category: null`; draft-only legacy (C) niet zichtbaar op store; geen draft-leak in JSON |

### Stap 6 — Admin: versieschakelaar + statusbadges

| | |
|--|--|
| **Doel** | UI Gepubliceerd/Draft; labels §4; stale-base banner |
| **Raakt** | `apps/admin/components/cms/cms-category-studio.tsx`, `apps/admin/lib/cms-admin-api.ts`, `apps/admin/lib/cms-category-editorial.ts`, eventueel shell page |
| **Depends** | Stap 2 (GET shape) |
| **Acceptatie** | Wisselen toont juiste payload; Gepubliceerd read-only; badges in_sync / unpublished / absent; stale banner zichtbaar wanneer van toepassing |

### Stap 7 — Admin: draft-editor opslaan + AI alleen op draft

| | |
|--|--|
| **Doel** | Save-draft knop; AI/proposal disabled op Published-tab; AI schrijft draft |
| **Raakt** | `cms-category-studio.tsx` (`generateProposal`, save), `cms-admin-api.ts`; indien van toepassing `apps/web/app/_lib/ai-content/jobs/category.ts` defaults `publish: false` |
| **Depends** | Stap 6, Stap 2 |
| **Acceptatie** | AI op Published-tab niet mogelijk; na AI sync_state = unpublished_changes; geen call naar publish vanuit generator |

### Stap 8 — Admin: preview, publish-dialog, rebase-UI, history

| | |
|--|--|
| **Doel** | Preview draft vs published; publish confirm; rebase keep vs replace; revisions list/view/restore |
| **Raakt** | `cms-live-preview.tsx`, preview host `apps/web/app/_lib/cms/use-cms-preview-host.ts` / `category-preview-client.tsx`, nieuwe history-component onder `apps/admin/components/cms/` |
| **Depends** | Stap 3–4, 6–7 |
| **Acceptatie** | Preview toont gekozen versie; publish zonder confirm faalt; stale publish geblokkeerd met rebase-CTA; keep behoudt inhoud; replace vraagt destroy-confirm; restore-to-draft + restore-and-publish werken E2E op één testslug |

### Stap 9 — Storefront-compatibiliteit (regressie)

| | |
|--|--|
| **Doel** | Live category pages ongewijzigd qua contract |
| **Raakt** | `apps/web/app/categorie/[slug]/page.tsx`, `fetch-store-cms.ts`, `overlay-category-editorial.ts` (alleen als response-shape wijzigt — bij voorkeur store JSON-veld `document` stabiel houden) |
| **Depends** | Stap 5 |
| **Acceptatie** | E2E: register/login niet vereist voor publieke category; published category toont editorial; draft-only wijziging niet zichtbaar tot publish; geen 500 op `/categorie/{slug}` |

### Stap 10 — Opruimen legacy

| | |
|--|--|
| **Doel** | Compat-read verwijderen; drop `document`/`published` na observatieperiode |
| **Raakt** | Migratie drop-columns; store route; admin types |
| **Depends** | Stap 9 stabiel op staging/local |
| **Acceptatie** | Geen code-referenties naar legacy kolommen; DB-schema clean; herrun migratie-pad gedocumenteerd als no-op |

### Afhankelijkheidsgrafiek (samenvatting)

```
0 → 1 → 2 → 3 → 4
         ↘ 6 → 7 → 8
    1 → 5 → 9 → 10
         3/4 ───↗
```

---

## 17. Randvoorwaarden (blijvend)

- Geen AI op storefront page load.  
- Geen stille overwrite van live.  
- Geen automatische merge van verouderde drafts.  
- Product Cloud / Commerce-scheiding ongewijzigd.  
- Definitive top-10 blijft leidend voor L3 product-specs; GPSR blijft buiten koopadvies.  
- Dit document wijzigen mag; implementatie pas na expliciete opdracht.
