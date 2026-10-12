import { readFileSync, readdirSync } from "node:fs"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"

const require = createRequire(import.meta.url)
const pgRoot = new URL("../../../../node_modules/.pnpm/", import.meta.url)
const pgFolder = readdirSync(pgRoot).filter((name) => name.startsWith("pg@")).sort().at(-1)
if (!pgFolder) throw new Error("De lokale Postgres-client ontbreekt.")
const pg = require(fileURLToPath(new URL(`${pgFolder}/node_modules/pg`, pgRoot))) as {
  Client: new (config: { connectionString: string; connectionTimeoutMillis: number }) => {
    connect: () => Promise<void>
    query: (sql: string) => Promise<{ rows?: unknown[] } | Array<{ rows?: unknown[] }>>
    end: () => Promise<void>
  }
}
import {
  COMMERCIAL_MESSAGES,
  COMMERCIAL_PROGRAMS,
  DRAFT_IMPROVEMENTS,
} from "../modules/engagement/commercial-library.ts"

function databaseUrl(): string {
  const fromEnv = process.env.DATABASE_URL?.trim()
  if (fromEnv) return fromEnv
  try {
    const env = readFileSync(new URL("../../.env", import.meta.url), "utf8")
    const line = env.split(/\r?\n/).find((row) => row.startsWith("DATABASE_URL="))
    if (line) return line.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "")
  } catch {
    // De lokale ontwikkeldatabase is de terugval.
  }
  return "postgres://europmade:REDACTED_DATABASE_PASSWORD@127.0.0.1:5432/europmade"
}

function dollar(value: string, tag: string): string {
  if (value.includes(`$${tag}$`)) throw new Error(`tekst botst met ${tag}`)
  return `$${tag}$${value}$${tag}$`
}

function sql(): string {
  const lines: string[] = ["BEGIN;"]
  COMMERCIAL_MESSAGES.forEach((message, index) => {
    const tag = `m${index}`
    const audience = message.audience ? `'${message.audience}'` : "NULL"
    lines.push(`
INSERT INTO communication_template (
  id, name, communication_type, audience, ready_to_send, layout, created_at, updated_at
)
SELECT ${dollar(message.id, tag)}, ${dollar(message.name, tag + "n")}, '${message.communication_type}',
       ${audience}, false, '${message.layout}', now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM communication_template
  WHERE deleted_at IS NULL AND (id = ${dollar(message.id, tag + "id")} OR name = ${dollar(message.name, tag + "nm")})
);`)
    const variantId = message.id.replace("ctpl_", "ctvar_") + "_nl"
    const versionId = message.id.replace("ctpl_", "ctver_") + "_nl"
    lines.push(`
INSERT INTO communication_template_variant (id, template_id, name, locale, created_at, updated_at)
SELECT ${dollar(variantId, tag + "v")}, ${dollar(message.id, tag + "t")}, 'Nederlands', 'nl', now(), now()
WHERE EXISTS (
  SELECT 1 FROM communication_template WHERE id = ${dollar(message.id, tag + "te")} AND deleted_at IS NULL
)
AND NOT EXISTS (
  SELECT 1 FROM communication_template_variant
  WHERE deleted_at IS NULL AND (id = ${dollar(variantId, tag + "vi")} OR (template_id = ${dollar(message.id, tag + "tv")} AND locale = 'nl'))
);`)
    lines.push(`
INSERT INTO communication_template_version (
  id, variant_id, version_number, subject, preheader, body, cta_label, cta_url,
  personalization_tokens, approval_status, activation_status, created_at, updated_at
)
SELECT ${dollar(versionId, tag + "r")}, ${dollar(variantId, tag + "rv")}, 1,
       ${dollar(message.subject, tag + "s")}, ${dollar(message.preheader, tag + "p")},
       ${dollar(message.body, tag + "b")}, ${dollar(message.cta_label, tag + "c")},
       ${dollar(message.cta_url, tag + "u")},
       '${JSON.stringify(message.tokens)}'::jsonb,
       'draft', 'inactive', now(), now()
WHERE EXISTS (
  SELECT 1 FROM communication_template_variant WHERE id = ${dollar(variantId, tag + "ve")} AND deleted_at IS NULL
)
AND NOT EXISTS (
  SELECT 1 FROM communication_template_version WHERE deleted_at IS NULL AND variant_id = ${dollar(variantId, tag + "vv")}
);`)
    if (!message.english) return
    const enVariant = message.id.replace("ctpl_", "ctvar_") + "_en"
    const enVersion = message.id.replace("ctpl_", "ctver_") + "_en"
    lines.push(`
INSERT INTO communication_template_variant (id, template_id, name, locale, created_at, updated_at)
SELECT ${dollar(enVariant, tag + "ev")}, ${dollar(message.id, tag + "et")}, 'English', 'en', now(), now()
WHERE EXISTS (
  SELECT 1 FROM communication_template WHERE id = ${dollar(message.id, tag + "ete")} AND deleted_at IS NULL
)
AND NOT EXISTS (
  SELECT 1 FROM communication_template_variant
  WHERE deleted_at IS NULL AND (id = ${dollar(enVariant, tag + "evi")} OR (template_id = ${dollar(message.id, tag + "etv")} AND locale = 'en'))
);`)
    lines.push(`
INSERT INTO communication_template_version (
  id, variant_id, version_number, subject, preheader, body, cta_label, cta_url,
  personalization_tokens, approval_status, activation_status, created_at, updated_at
)
SELECT ${dollar(enVersion, tag + "er")}, ${dollar(enVariant, tag + "erv")}, 1,
       ${dollar(message.english.subject, tag + "es")}, ${dollar(message.english.preheader, tag + "ep")},
       ${dollar(message.english.body, tag + "eb")}, ${dollar(message.english.cta_label, tag + "ec")},
       ${dollar(message.cta_url, tag + "eu")},
       '${JSON.stringify(message.tokens)}'::jsonb,
       'draft', 'inactive', now(), now()
WHERE EXISTS (
  SELECT 1 FROM communication_template_variant WHERE id = ${dollar(enVariant, tag + "eve")} AND deleted_at IS NULL
)
AND NOT EXISTS (
  SELECT 1 FROM communication_template_version WHERE deleted_at IS NULL AND variant_id = ${dollar(enVariant, tag + "evv")}
);`)
  })

  for (const program of COMMERCIAL_PROGRAMS) {
    const tag = program.id.replace("elpr_", "")
    const audience = program.audience ? `'${program.audience}'` : "NULL"
    const mode = program.start_mode ? `'${program.start_mode}'` : "NULL"
    const trigger = program.start_trigger ? `'${program.start_trigger}'` : "NULL"
    const criteria =
      program.program_type === "newsletter" || program.program_type === "campaign"
        ? `'{"locales":["nl"]}'::jsonb`
        : "NULL"
    lines.push(`
INSERT INTO engagement_lifecycle_program (
  id, name, program_type, start_trigger, start_mode, audience, activation_status, selection_criteria, created_at, updated_at
)
SELECT ${dollar(program.id, tag + "p")}, ${dollar(program.name, tag + "pn")}, '${program.program_type}',
       ${trigger}, ${mode}, ${audience}, 'concept', ${criteria}, now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM engagement_lifecycle_program
  WHERE deleted_at IS NULL AND (id = ${dollar(program.id, tag + "pi")} OR (program_type = '${program.program_type}' AND name = ${dollar(program.name, tag + "pnn")}))
);`)
    const sequenceId = program.id.replace("elpr_", "eseq_")
    lines.push(`
INSERT INTO engagement_sequence (id, program_id, name, created_at, updated_at)
SELECT ${dollar(sequenceId, tag + "q")}, ${dollar(program.id, tag + "qp")}, ${dollar(program.name, tag + "qn")}, now(), now()
WHERE EXISTS (
  SELECT 1 FROM engagement_lifecycle_program WHERE id = ${dollar(program.id, tag + "qe")} AND deleted_at IS NULL
)
AND NOT EXISTS (
  SELECT 1 FROM engagement_sequence
  WHERE deleted_at IS NULL AND (id = ${dollar(sequenceId, tag + "qi")} OR (program_id = ${dollar(program.id, tag + "qv")} AND name = ${dollar(program.name, tag + "qnn")}))
);`)
    for (const step of program.steps) {
      const variantId = step.template_id.replace("ctpl_", "ctvar_") + "_nl"
      lines.push(`
INSERT INTO engagement_sequence_step (
  id, sequence_id, step_order, delay_minutes, template_id, variant_id, created_at, updated_at
)
SELECT ${dollar(step.id, tag + step.id)}, ${dollar(sequenceId, tag + "s" + step.id)},
       ${program.steps.indexOf(step) + 1}, ${step.delay_minutes},
       ${dollar(step.template_id, tag + "st" + step.id)}, ${dollar(variantId, tag + "sv" + step.id)},
       now(), now()
WHERE EXISTS (
  SELECT 1 FROM engagement_sequence WHERE id = ${dollar(sequenceId, tag + "se" + step.id)} AND deleted_at IS NULL
)
AND EXISTS (
  SELECT 1 FROM communication_template_variant WHERE id = ${dollar(variantId, tag + "ve" + step.id)} AND deleted_at IS NULL
)
AND NOT EXISTS (
  SELECT 1 FROM engagement_sequence_step
  WHERE deleted_at IS NULL AND (id = ${dollar(step.id, tag + "si" + step.id)} OR (sequence_id = ${dollar(sequenceId, tag + "so" + step.id)} AND step_order = ${program.steps.indexOf(step) + 1}))
);`)
    }
  }

  COMMERCIAL_MESSAGES.forEach((message, index) => {
    const tag = `u${index}`
    lines.push(`
UPDATE communication_template
SET layout = '${message.layout}', updated_at = now()
WHERE id = ${dollar(message.id, tag + "t")}
  AND deleted_at IS NULL
  AND layout IS DISTINCT FROM '${message.layout}';
UPDATE communication_template_version ver
SET preheader = ${dollar(message.preheader, tag + "p")},
    body = ${dollar(message.body, tag + "b")},
    cta_label = ${dollar(message.cta_label, tag + "c")},
    cta_url = ${dollar(message.cta_url, tag + "u")},
    updated_at = now()
FROM communication_template_variant tv
WHERE ver.variant_id = tv.id
  AND tv.template_id = ${dollar(message.id, tag + "tv")}
  AND tv.locale = 'nl'
  AND ver.deleted_at IS NULL
  AND tv.deleted_at IS NULL
  AND ver.approval_status = 'draft'
  AND ver.activation_status = 'inactive'
  AND ver.used_at IS NULL;`)
    if (!message.english) return
    lines.push(`
UPDATE communication_template_version ver
SET subject = ${dollar(message.english.subject, tag + "es")},
    preheader = ${dollar(message.english.preheader, tag + "ep")},
    body = ${dollar(message.english.body, tag + "eb")},
    cta_label = ${dollar(message.english.cta_label, tag + "ec")},
    updated_at = now()
FROM communication_template_variant tv
WHERE ver.variant_id = tv.id
  AND tv.template_id = ${dollar(message.id, tag + "et")}
  AND tv.locale = 'en'
  AND ver.deleted_at IS NULL
  AND tv.deleted_at IS NULL
  AND ver.approval_status = 'draft'
  AND ver.activation_status = 'inactive'
  AND ver.used_at IS NULL;`)
  })

  lines.push(`
UPDATE communication_template t
SET layout = 'newsletter', updated_at = now()
WHERE t.deleted_at IS NULL
  AND t.name = 'Europese merken'
  AND NOT EXISTS (
    SELECT 1
    FROM communication_template_version ver
    JOIN communication_template_variant tv ON tv.id = ver.variant_id
    WHERE tv.template_id = t.id
      AND ver.deleted_at IS NULL
      AND (ver.approval_status <> 'draft' OR ver.activation_status = 'active' OR ver.used_at IS NOT NULL)
  );
UPDATE communication_template_version ver
SET body = ${dollar(
    "<!--em-layout:newsletter--><!--em-hero--><h2>Drie producten om te bekijken</h2><p>De kaarten komen uit de catalogus die nu gepubliceerd is.</p><!--em-bind:selection-->",
    "embody"
  )},
    updated_at = now()
WHERE ver.id = (
  SELECT ver2.id
  FROM communication_template_version ver2
  JOIN communication_template_variant tv ON tv.id = ver2.variant_id
  JOIN communication_template t ON t.id = tv.template_id
  WHERE t.deleted_at IS NULL
    AND t.name = 'Europese merken'
    AND ver2.deleted_at IS NULL
    AND ver2.approval_status = 'draft'
    AND ver2.activation_status = 'inactive'
    AND ver2.used_at IS NULL
  ORDER BY ver2.version_number DESC
  LIMIT 1
);`)

  for (const draft of DRAFT_IMPROVEMENTS) {
    lines.push(`
UPDATE communication_template_version ver
SET subject = ${dollar(draft.subject, "dsub")},
    preheader = ${dollar(draft.preheader, "dpre")},
    body = ${dollar(draft.body, "dbody")},
    cta_label = ${dollar(draft.cta_label, "dcta")},
    cta_url = ${dollar(draft.cta_url, "durl")},
    personalization_tokens = '${JSON.stringify(draft.tokens)}'::jsonb,
    updated_at = now()
FROM communication_template_variant tv
JOIN communication_template t ON t.id = tv.template_id AND t.deleted_at IS NULL
WHERE ver.variant_id = tv.id
  AND ver.deleted_at IS NULL
  AND tv.deleted_at IS NULL
  AND t.name = ${dollar(draft.template_name, "dname")}
  AND ver.version_number = ${draft.version_number}
  AND ver.approval_status = 'draft'
  AND ver.activation_status = 'inactive'
  AND ver.used_at IS NULL
  AND length(ver.body) < 80;
`)
  }
  lines.push(`
UPDATE engagement_lifecycle_program
SET name = 'Consument zonder bestelling na 30, 60 en 90 dagen', updated_at = now()
WHERE id = 'elpr_lib_c_back30'
  AND deleted_at IS NULL
  AND activation_status = 'concept';
UPDATE engagement_lifecycle_program
SET start_trigger = NULL, start_mode = NULL,
    name = CASE id
      WHEN 'elpr_lib_c_back60' THEN 'Vervangen: 60 dagen zit in de reeks zonder bestelling'
      ELSE 'Vervangen: 90 dagen zit in de reeks zonder bestelling'
    END,
    updated_at = now()
WHERE id IN ('elpr_lib_c_back60', 'elpr_lib_c_back90')
  AND deleted_at IS NULL
  AND activation_status = 'concept'
  AND EXISTS (
    SELECT 1 FROM engagement_sequence_step
    WHERE id = 'estp_lib_c_back30_3' AND deleted_at IS NULL
  );
SELECT
  (SELECT count(*) FROM communication_template WHERE id LIKE 'ctpl_lib_%' AND deleted_at IS NULL) AS messages,
  (SELECT count(*) FROM communication_template_version ver
     JOIN communication_template_variant tv ON tv.id = ver.variant_id
     WHERE tv.template_id LIKE 'ctpl_lib_%' AND ver.deleted_at IS NULL AND ver.approval_status = 'draft') AS draft_versions,
  (SELECT count(*) FROM engagement_lifecycle_program WHERE id LIKE 'elpr_lib_%' AND deleted_at IS NULL AND activation_status = 'concept') AS programs;
COMMIT;`)
  return lines.join("\n")
}

async function psql(statement: string): Promise<string> {
  const client = new pg.Client({
    connectionString: databaseUrl(),
    connectionTimeoutMillis: 8000,
  })
  await client.connect()
  try {
    const result = await client.query(statement)
    const last = Array.isArray(result) ? result.at(-1) : result
    return JSON.stringify(last?.rows ?? [])
  } finally {
    await client.end()
  }
}

const output = await psql(sql())
console.log(output)
