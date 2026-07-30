# ADR-0014 — Offer-CRUD zonder Buy Box-engine in Seller→Commerce-batch

## Status

Geaccepteerd

## Context

S3-03-06 eist prijs-/voorraadkoppeling aan Commerce Cloud. S3-04-03 (Offer-CRUD) hangt formeel af van S3-04-02 (Buy Box-engine) en eist `BuyBoxRecomputed` bij elke wijziging. Voor de eerste Seller→Commerce-overgang (aanbod voorbereiden na EAN-match / nieuw product) is een werkende Offer+Price+Inventory voldoende; de Buy Box-berekening en -cache zijn aparte tickets (S3-04-02/05/04).

## Beslissing

1. Lever **S3-04-01** (C.1–C.3) + **minimale Offer-CRUD** (aanmaken/bijwerken/ophalen van eigen offers met prijs en voorraad) in deze batch.
2. **S3-04-02**, **S3-04-05** en Buy Box-positie-UI (**S3-04-04**) blijven buiten scope.
3. Bij Offer create/update wordt een **audit-logregel** geschreven dat Buy Box-herberekening volgt zodra S3-04-02 bestaat; er wordt **geen** `buy_box_computation`-rij geschreven en geen nep-winnaar getoond.
4. Product-05 toont Buy Box-positie als placeholder-notice (geen fake “Buy Box-winnaar”).

## Consequenties

- Sellers kunnen een aanbod voorbereiden en opslaan.
- S3-04-02 moet later `BuyBoxRecomputed` / herberekening aansluiten op dezelfde Offer-mutaties.
