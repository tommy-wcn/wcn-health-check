/**
 * Runs SQL migration files against the Supabase database.
 *
 * Usage: node --env-file=.env scripts/migrate.mjs [file...]
 * With no arguments, runs every file in supabase/migrations/ in name order.
 * Requires SUPABASE_DB_URL (session-pooler connection string) in .env.
 *
 * Note: this is a simple runner with no applied-migrations tracking —
 * re-running a file that already ran will error on duplicate objects.
 */
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const MIGRATIONS_DIR = fileURLToPath(new URL('../supabase/migrations/', import.meta.url))

const url = process.env.SUPABASE_DB_URL
if (!url) {
  console.error('Set SUPABASE_DB_URL in .env (Supabase dashboard → Connect → Session pooler URI).')
  process.exit(1)
}

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort().map((f) => MIGRATIONS_DIR + f)

const client = new pg.Client({ connectionString: url })
await client.connect()
try {
  for (const file of files) {
    const sql = await readFile(file, 'utf8')
    console.log(`Running ${file}…`)
    await client.query('begin')
    try {
      await client.query(sql)
      await client.query('commit')
      console.log('  ✓ applied')
    } catch (err) {
      await client.query('rollback')
      throw err
    }
  }
} finally {
  await client.end()
}
