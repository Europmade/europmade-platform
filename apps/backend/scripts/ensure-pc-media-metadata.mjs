/**
 * Ensure pc_media.metadata exists (same SQL as Migration20260902160000).
 * Prefers DATABASE_URL via `pg` when available; otherwise uses docker exec
 * against europmade-postgres (same DB as Medusa local).
 */
import { spawnSync } from "node:child_process"

const SQL_ADD = `ALTER TABLE IF EXISTS "pc_media" ADD COLUMN IF NOT EXISTS "metadata" jsonb NULL;`
const SQL_CHECK = `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='pc_media' AND column_name='metadata';`
const SQL_RECORD = `INSERT INTO mikro_orm_migrations (id, name, executed_at) SELECT 'Migration20260902160000-manual', 'Migration20260902160000', now() WHERE NOT EXISTS (SELECT 1 FROM mikro_orm_migrations WHERE name = 'Migration20260902160000');`
const SQL_SHOW = `SELECT name, executed_at FROM mikro_orm_migrations WHERE name = 'Migration20260902160000';`

async function viaPg() {
  const { default: pg } = await import("pg")
  const url =
    process.env.DATABASE_URL ||
    "postgres://europmade:REDACTED_DATABASE_PASSWORD@127.0.0.1:5432/europmade"
  const client = new pg.Client({ connectionString: url })
  await client.connect()
  try {
    const cols = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'pc_media' ORDER BY ordinal_position`
    )
    console.log(
      "pc_media columns:",
      cols.rows.map((r) => r.column_name).join(", ")
    )
    const hasMeta = cols.rows.some((r) => r.column_name === "metadata")
    if (!hasMeta) {
      console.log("Applying metadata column…")
      await client.query(SQL_ADD)
      await client.query(SQL_RECORD)
    } else {
      console.log("metadata column already present")
    }
    const check = await client.query(SQL_CHECK)
    console.log("metadata column:", check.rows)
    const mig = await client.query(SQL_SHOW)
    console.log("migration row:", mig.rows)
  } finally {
    await client.end()
  }
}

function viaDocker() {
  console.log("pg package not found — using docker exec europmade-postgres")
  const run = (sql) => {
    const r = spawnSync(
      "docker",
      ["exec", "europmade-postgres", "psql", "-U", "europmade", "-d", "europmade", "-c", sql],
      { encoding: "utf8" }
    )
    if (r.status !== 0) {
      console.error(r.stderr || r.stdout)
      process.exit(r.status || 1)
    }
    process.stdout.write(r.stdout)
  }
  run(SQL_ADD)
  run(SQL_CHECK)
  run(SQL_RECORD)
  run(SQL_SHOW)
}

try {
  await viaPg()
} catch (err) {
  if (err && (err.code === "ERR_MODULE_NOT_FOUND" || String(err).includes("Cannot find package 'pg'"))) {
    viaDocker()
  } else {
    throw err
  }
}
