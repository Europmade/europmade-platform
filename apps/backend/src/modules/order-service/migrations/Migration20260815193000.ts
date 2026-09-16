import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * Order destination country + shipment shipped status/timestamp (fulfil hardening).
 */
export class Migration20260815193000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      alter table if exists "em_order"
        add column if not exists "shipping_country_code" text null;
    `)
    this.addSql(`
      alter table if exists "shipment"
        add column if not exists "shipped_at" timestamptz null;
    `)
    this.addSql(`
      alter table if exists "shipment" drop constraint if exists "shipment_status_check";
    `)
    this.addSql(`
      alter table if exists "shipment"
        add constraint "shipment_status_check"
        check (
          "status" is null
          or "status" in (
            'pending',
            'shipped',
            'in_transit',
            'out_for_delivery',
            'delivered',
            'exception'
          )
        );
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`
      alter table if exists "shipment" drop constraint if exists "shipment_status_check";
    `)
    this.addSql(`
      update "shipment" set "status" = 'in_transit' where "status" = 'shipped';
    `)
    this.addSql(`
      alter table if exists "shipment"
        add constraint "shipment_status_check"
        check (
          "status" is null
          or "status" in (
            'pending',
            'in_transit',
            'out_for_delivery',
            'delivered',
            'exception'
          )
        );
    `)
    this.addSql(`
      alter table if exists "shipment" drop column if exists "shipped_at";
    `)
    this.addSql(`
      alter table if exists "em_order" drop column if exists "shipping_country_code";
    `)
  }
}
