import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * Consumenten voor nieuwsbriefinschrijving.
 * Geen Organization. customer_id is een soft ref naar Medusa Customer.
 * Nieuwsbriefvoorkeur staat op deze rij, niet op EngagementPreference.
 * audience/ready_to_send op de template: doelgroep en klaarzetten zonder verzending.
 * consumer_id op history blijft leeg tot een latere verzendstap.
 */
export class Migration20261007143000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "engagement_consumer" ("id" text not null, "email" text not null, "name" text null, "country_code" text null, "locale" text null, "customer_id" text null, "source" text not null, "newsletter_enabled" boolean not null default false, "subscribed_at" timestamptz null, "unsubscribed_at" timestamptz null, "unsubscribe_token" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "engagement_consumer_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_consumer_deleted_at" ON "engagement_consumer" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_engagement_consumer_email_unique" ON "engagement_consumer" ("email") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_engagement_consumer_customer_unique" ON "engagement_consumer" ("customer_id") WHERE customer_id IS NOT NULL AND deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_engagement_consumer_token_unique" ON "engagement_consumer" ("unsubscribe_token") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_consumer_newsletter" ON "engagement_consumer" ("newsletter_enabled") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `alter table "communication_template" add column if not exists "audience" text null;`
    )
    this.addSql(
      `alter table "communication_template" add column if not exists "ready_to_send" boolean not null default false;`
    )
    this.addSql(
      `alter table "engagement_communication_event" add column if not exists "consumer_id" text null;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_engagement_communication_event_consumer_id" ON "engagement_communication_event" ("consumer_id") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_engagement_communication_event_consumer_id";`)
    this.addSql(`alter table "engagement_communication_event" drop column if exists "consumer_id";`)
    this.addSql(`alter table "communication_template" drop column if exists "ready_to_send";`)
    this.addSql(`alter table "communication_template" drop column if exists "audience";`)
    this.addSql(`drop table if exists "engagement_consumer" cascade;`)
  }
}
