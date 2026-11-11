# Product Cloud Excel templates

## Seller

`seller-product-template.xlsx` — approved Seller Excel template served by:

`GET /store/product-cloud/import/template?format=xlsx`

Includes cascading Level 1–3 dropdowns, automatic product specifications, commerce columns, validation lists, and hidden helper sheets. Fully English. Do not modify when working on the Admin template.

## Admin

`admin-product-template.xlsx` — Admin Product Cloud template served by:

`GET /admin/product-cloud/brand-import/template`

Central product data only (no Seller SKU, prices, stock, shipping). Same English category/spec catalog and cascading dropdowns as the Seller template. Import preview/commit: Productaanleveringen (`/admin/product-cloud/brand-import/*`).
