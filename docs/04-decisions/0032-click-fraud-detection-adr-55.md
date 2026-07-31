# ADR-0032 — Click-fraude-detectie (Blueprint ADR-55) — S3-07-06

**Status:** Geaccepteerd  
**Datum:** 2026-07-31  
**Domein:** Affiliate, Moderation  
**Sluit af:** Blueprint ADR-55; `affiliate-platform/spec.md` §6  
**Bouwt op:** ADR-0029 (consent), ADR-0030 (attributie)

## Context

Click-fraude-drempels staan niet in de Blueprint-spec; alleen zelf-conversie is hard vastgelegd. Medusa biedt geen fraudemodule voor marketplace-affiliates.

## Beslissing (MVP)

1. **Signalen (server-side, na geldige ConsentRecord):**
   - `click_velocity_link` — > **20** clicks met dezelfde `visitor_hash` op **dezelfde** `affiliate_link` binnen **60 minuten**.
   - `click_velocity_affiliate` — > **50** clicks met dezelfde `visitor_hash` over **alle** links van één affiliate binnen **24 uur**.
2. **Reactie bij overschrijding:**
   - Geen nieuwe `Click` aanmaken (HTTP 403).
   - Wel `ModerationCase` `Fraude-signaal` met `signal_code` en `affiliate_id`.
   - AI beslist nooit; alleen Beheerder via Moderation Center.
3. **Zelf-conversie** blijft ADR-0030 (`self_attribution`); geen Click-blokkade nodig.
4. **Geen IP/UA-opslag** in MVP (AVG); uitsluitend `visitor_hash` + affiliate/link-aggregaten.

## Consequenties

- Detectie in `executeTrackClick` vóór `createClicks`.
- Cases verschijnen in wachtrij **Fraude-signalen** (S3-03-07).
