# Berichten, Reviews & Q&A — Functionele Specificatie

**Status:** v1.0, concept
**MVP-status:** Must Have (Berichten, Reviews) / Should Have (Q&A)
**Basis:** `Review`-domeinobject (Sprint 2, al gebruikt door de Buy Box-weging), Notification-domeinobject (Sprint 2).

---

## 1. Berichten tussen koper en verkoper

### Doel
Eén platformkanaal voor communicatie tussen Klant en Seller over een specifieke Order — voorkomt dat klantenservice-escalaties buiten het platform om moeten.

### Rollen
Klant en Seller, uitsluitend binnen de context van een gedeelde Order (geen vrije, ongerichte messaging).

### Kernproces
Klant of Seller start een conversatie gekoppeld aan een Order(regel); beide partijen kunnen berichten uitwisselen; Beheerder kan bij een geëscaleerd geschil meelezen (aansluitend op het bestaande Dispute-escalatiepatroon).

### Datastructuur — raakvlak met Sprint 2
Nieuw, licht domeinconcept: **Message** (gekoppeld aan een Order en twee deelnemers — Klant, Seller). Geen los "Conversation"-object nodig; een reeks Messages met hetzelfde Order-id vormt de conversatie.

### MVP-prioritering
Must Have: bericht versturen/ontvangen, gekoppeld aan Order. Should Have: leesbevestiging, bestandsbijlage. Could Have: geautomatiseerde antwoorden.

---

## 2. Reviews

### Doel
Vult het al in Sprint 2 gemodelleerde onderscheid tussen Productreview en Verkopersreview (`01-domain-model.md` §18) met een daadwerkelijk plaatsings-/weergaveproces — de Buy Box gebruikt de verkopersreview-score al, maar zonder dit proces kan die score nooit ontstaan.

### Kernproces
Na een voltooide Order (koppeling aan Orderregel, voorkomt niet-kopers-reviews — al bevroren regel) kan de Klant een Productreview en/of Verkopersreview plaatsen (score + tekst). Reviews zijn publiek zichtbaar; Beheerder kan modereren (aansluitend op het bestaande Moderation Center-patroon).

### MVP-prioritering
Must Have: review plaatsen (beide typen), publieke weergave, koppeling aan Buy Box-berekening (al bevroren). Should Have: Seller-reactie op een review. Could Have: foto's bij een review.

---

## 3. Q&A (vraag & antwoord op productpagina)

### Doel
Stelt een Bezoeker/Klant in staat een vraag over een specifiek product te stellen, beantwoord door de Seller of andere kopers.

### Kernproces
Vraag gekoppeld aan een Product (niet aan een Offer — consistent met de Product Cloud/Commerce Cloud-scheiding: een vraag over het product zelf is nooit Seller-specifiek). Seller of Beheerder kan beantwoorden; andere gebruikers kunnen eerder gestelde vragen zien.

### MVP-prioritering
**Should Have**, niet Must Have — er is geen bestaand domeinobject, geen bevroren UX-scherm, en geen expliciete vermelding in de Blueprint zelf; dit is de minst dringende van de drie onderdelen in dit document. Wordt aanbevolen ná Berichten en Reviews te bouwen.

---

## 4. Notificaties (koppelvlak)

Alle drie bovenstaande processen (nieuw bericht, reviewreactie, beantwoorde vraag) gebruiken het al in Sprint 2 volledig gemodelleerde Notification-domeinobject (`01-domain-model.md` §24) — dit document introduceert geen nieuwe notificatielogica, uitsluitend nieuwe brongebeurtenissen die een al bestaand mechanisme aanroepen.

---

## 5. Openstaande punten

- Moderatiebeleid voor Reviews (geautomatiseerd/handmatig, drempelwaarden) — nog niet vastgesteld.
- Of Q&A een Must Have wordt voor MVP-lancering, is een expliciete scope-vraag voor de projecteigenaar (deze spec beveelt Should Have aan, beslist het niet).
