import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * Return status Onderweg + refund lifecycle statuses (ADR-0040 update).
 */
export class Migration20260815190000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      alter table if exists "em_return" drop constraint if exists "em_return_refund_status_check";
    `)
    this.addSql(`
      alter table if exists "em_return" drop constraint if exists "em_return_status_check";
    `)
    this.addSql(`
      update "em_return"
      set "refund_status" = case "refund_status"
        when 'Pending' then 'requested'
        when 'Uitgevoerd' then 'processed'
        when 'Geforceerd' then 'forced'
        else "refund_status"
      end
      where "refund_status" in ('Pending', 'Uitgevoerd', 'Geforceerd');
    `)
    this.addSql(`
      alter table if exists "em_return"
        add constraint "em_return_status_check"
        check (
          "status" in (
            'Aangevraagd',
            'Bevestigd',
            'Onderweg',
            'Ontvangen',
            'Verwerkt',
            'Afgewezen',
            'Geëscaleerd'
          )
        );
    `)
    this.addSql(`
      alter table if exists "em_return"
        add constraint "em_return_refund_status_check"
        check (
          "refund_status" is null
          or "refund_status" in (
            'requested',
            'processing',
            'processed',
            'failed',
            'forced',
            'Pending',
            'Uitgevoerd',
            'Geforceerd'
          )
        );
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`
      update "em_return"
      set "status" = 'Bevestigd'
      where "status" = 'Onderweg';
    `)
    this.addSql(`
      update "em_return"
      set "refund_status" = case "refund_status"
        when 'requested' then 'Pending'
        when 'processing' then 'Pending'
        when 'processed' then 'Uitgevoerd'
        when 'forced' then 'Geforceerd'
        when 'failed' then 'Pending'
        else "refund_status"
      end;
    `)
  }
}
