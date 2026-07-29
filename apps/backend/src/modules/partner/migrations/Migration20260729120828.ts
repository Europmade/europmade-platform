import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260729120828 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "seller" drop constraint if exists "seller_company_id_foreign";`);

    this.addSql(`alter table if exists "seller" alter column "company_id" type text using ("company_id"::text);`);
    this.addSql(`alter table if exists "seller" alter column "company_id" drop not null;`);
    this.addSql(`alter table if exists "seller" add constraint "seller_company_id_foreign" foreign key ("company_id") references "company" ("id") on update cascade on delete set null;`);

    // Bugfix ("Company ... already exists" op stap 1 "Partner kiezen"): de
    // duplicaatcontrole op chamber_of_commerce_number + country_code mag
    // nooit vuren op lege placeholder-waarden (spec §1.2, "Concept mag
    // onvolledig zijn"). Niet automatisch door db:generate opgepikt (alleen
    // de WHERE-conditie van een bestaande index wijzigt), daarom handmatig.
    this.addSql(`DROP INDEX IF EXISTS "IDX_company_chamber_of_commerce_number_country_code_unique";`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_company_chamber_of_commerce_number_country_code_unique" ON "company" ("chamber_of_commerce_number", "country_code") WHERE deleted_at IS NULL AND chamber_of_commerce_number <> '' AND country_code <> '';`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "seller" drop constraint if exists "seller_company_id_foreign";`);

    this.addSql(`alter table if exists "seller" alter column "company_id" type text using ("company_id"::text);`);
    this.addSql(`alter table if exists "seller" alter column "company_id" set not null;`);
    this.addSql(`alter table if exists "seller" add constraint "seller_company_id_foreign" foreign key ("company_id") references "company" ("id") on update cascade;`);

    this.addSql(`DROP INDEX IF EXISTS "IDX_company_chamber_of_commerce_number_country_code_unique";`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_company_chamber_of_commerce_number_country_code_unique" ON "company" ("chamber_of_commerce_number", "country_code") WHERE deleted_at IS NULL;`);
  }

}
