import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * Full EuropMade category hierarchy: nest existing roots where logical and
 * create missing subcategories under every relevant hoofdcatégorie.
 * Idempotent by slug. Does not rewrite product↔category links.
 */
export class Migration20261020140000 extends Migration {
  override async up(): Promise<void> {
    // Nest existing categories under canonical parents.
    const nests: Array<[string, string]> = [
      ["keuken", "huishouden"],
      ["slaapkamer", "wonen"],
      ["badkamer", "wonen"],
      ["verlichting", "wonen"],
      ["home-en-living", "wonen"],
      ["robotstofzuiger", "huishouden"],
      ["heggenscharen", "tuin"],
      ["outdoor", "sport"],
      ["speelgoed", "baby-en-kind"],
    ]
    for (const [childSlug, parentSlug] of nests) {
      this.addSql(`
        UPDATE pc_category AS child
        SET parent_category_id = parent.id,
            updated_at = now()
        FROM pc_category AS parent
        WHERE parent.deleted_at IS NULL
          AND child.deleted_at IS NULL
          AND parent.slug = '${parentSlug}'
          AND child.slug = '${childSlug}'
          AND child.parent_category_id IS DISTINCT FROM parent.id;
      `)
    }

    const creates: Array<[string, string, string]> = [
      ["Audio & Headphones", "audio-headphones", "elektronica"],
      ["Computers & Laptops", "computers-laptops", "elektronica"],
      ["Telefoons & Tablets", "phones-tablets", "elektronica"],
      ["TV & Video", "tv-video", "elektronica"],
      ["Smart Home", "smart-home", "elektronica"],
      ["Netwerken & Peripherals", "networking", "elektronica"],
      ["Schoonmaak", "schoonmaak", "huishouden"],
      ["Was & Drogen", "was-droog", "huishouden"],
      ["Woonkamer", "woonkamer", "wonen"],
      ["Opslag & Organisatie", "opslag-organisatie", "wonen"],
      ["Fitness & Training", "fitness-training", "sport"],
      ["Fietsen & Accessoires", "fietsen", "sport"],
      ["Hardlopen & Trail", "hardlopen", "sport"],
      ["Kamperen", "kamperen", "outdoor"],
      ["Wandelen & Outdoor gear", "wandelen-outdoor", "outdoor"],
      ["Grasmaaiers & Robots", "grasmaaiers-robots", "tuin"],
      ["Tuinmeubelen", "tuinmeubelen", "tuin"],
      ["Irrigatie & Kweek", "irrigatie-kweek", "tuin"],
      ["Tuinhandgereedschap", "tuinhandgereedschap", "tuin"],
      ["Handgereedschap", "handgereedschap", "klus-en-gereedschap"],
      ["Elektrisch gereedschap", "elektrisch-gereedschap", "klus-en-gereedschap"],
      ["Werkplaats & Opslag", "werkplaats-opslag", "klus-en-gereedschap"],
      ["Schrijfwaren", "schrijfwaren", "kantoor"],
      ["Bureau & Organisatie", "bureau-organisatie", "kantoor"],
      ["Boeken", "boeken", "boeken-media"],
      ["Media & Entertainment", "media-entertainment", "boeken-media"],
      ["Keramiek & Glas", "keramiek-glas", "ambacht"],
      ["Textiel & Wol", "textiel-wol", "ambacht"],
      ["Hout & Leer", "hout-leer", "ambacht"],
      ["Huidverzorging", "huidverzorging", "beauty-en-verzorging"],
      ["Haarverzorging", "haarverzorging", "beauty-en-verzorging"],
      ["Make-up & Geur", "make-up-geur", "beauty-en-verzorging"],
      ["Babyverzorging", "babyverzorging", "baby-en-kind"],
      ["Kinderkamer", "kinderkamer", "baby-en-kind"],
      ["Herenschoenen", "herenschoenen", "schoenen"],
      ["Damesschoenen", "damesschoenen", "schoenen"],
      ["Kinderschoenen", "kinderschoenen", "schoenen"],
      ["Rugzakken", "rugzakken", "tassen-en-accessoires"],
      ["Handtassen & Tassen", "handtassen", "tassen-en-accessoires"],
      ["Reisaccessoires", "reisaccessoires", "tassen-en-accessoires"],
      ["Hond", "hond", "dieren"],
      ["Kat", "kat", "dieren"],
      ["Overige dieren", "overige-dieren", "dieren"],
      ["Auto-accessoires", "auto-accessoires", "auto-motor"],
      ["Motor & Scooter", "motor-scooter", "auto-motor"],
      ["Sieraden", "sieraden", "juwelen-horloges"],
      ["Horloges", "horloges", "juwelen-horloges"],
      ["Dranken", "dranken", "voeding"],
      ["Levensmiddelen & Delicatessen", "levensmiddelen", "voeding"],
      ["Vitaminen & Supplements", "vitaminen-supplements", "gezondheid"],
      ["Persoonlijke verzorging", "persoonlijke-verzorging", "gezondheid"],
      ["Planten", "planten", "plant-en-bloem"],
      ["Bloemen & Vazen", "bloemen-vazen", "plant-en-bloem"],
      ["Feestdagen", "feestdagen", "feest-seizoen"],
      ["Seizoensdecoratie", "seizoensdecoratie", "feest-seizoen"],
      ["Cadeausets", "cadeausets", "cadeaus"],
      ["Persoonlijke cadeaus", "persoonlijke-cadeaus", "cadeaus"],
    ]

    for (const [name, slug, parentSlug] of creates) {
      this.addSql(`
        INSERT INTO pc_category (id, name, slug, parent_category_id, created_at, updated_at)
        SELECT
          'pcgy_' || upper(substr(md5('${slug}' || clock_timestamp()::text), 1, 26)),
          '${name.replace(/'/g, "''")}',
          '${slug}',
          parent.id,
          now(),
          now()
        FROM pc_category AS parent
        WHERE parent.deleted_at IS NULL
          AND parent.slug = '${parentSlug}'
          AND NOT EXISTS (
            SELECT 1 FROM pc_category c
            WHERE c.deleted_at IS NULL AND c.slug = '${slug}'
          );
      `)
      this.addSql(`
        UPDATE pc_category AS child
        SET parent_category_id = parent.id,
            updated_at = now()
        FROM pc_category AS parent
        WHERE parent.deleted_at IS NULL
          AND child.deleted_at IS NULL
          AND parent.slug = '${parentSlug}'
          AND child.slug = '${slug}'
          AND child.parent_category_id IS DISTINCT FROM parent.id;
      `)
    }
  }

  override async down(): Promise<void> {
    // Soft-delete only newly introduced slugs (do not un-nest reused roots here).
    this.addSql(`
      UPDATE pc_category
      SET deleted_at = now(), updated_at = now()
      WHERE deleted_at IS NULL
        AND slug IN (
          'audio-headphones','computers-laptops','phones-tablets','tv-video','smart-home','networking',
          'schoonmaak','was-droog','woonkamer','opslag-organisatie',
          'fitness-training','fietsen','hardlopen','kamperen','wandelen-outdoor',
          'grasmaaiers-robots','tuinmeubelen','irrigatie-kweek','tuinhandgereedschap',
          'handgereedschap','elektrisch-gereedschap','werkplaats-opslag',
          'schrijfwaren','bureau-organisatie','boeken','media-entertainment',
          'keramiek-glas','textiel-wol','hout-leer',
          'huidverzorging','haarverzorging','make-up-geur',
          'babyverzorging','kinderkamer',
          'herenschoenen','damesschoenen','kinderschoenen',
          'rugzakken','handtassen','reisaccessoires',
          'hond','kat','overige-dieren',
          'auto-accessoires','motor-scooter',
          'sieraden','horloges',
          'dranken','levensmiddelen',
          'vitaminen-supplements','persoonlijke-verzorging',
          'planten','bloemen-vazen',
          'feestdagen','seizoensdecoratie',
          'cadeausets','persoonlijke-cadeaus'
        );
    `)
  }
}
