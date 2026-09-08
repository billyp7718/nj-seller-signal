import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let client: NeonQueryFunction<false, false> | null = null;

export function getDb() {
  if (!process.env.DATABASE_URL) return null;
  if (!client) client = neon(process.env.DATABASE_URL);
  return client;
}

export async function ensureSchema() {
  const sql = getDb();
  if (!sql) return null;

  await sql`
    CREATE TABLE IF NOT EXISTS seller_leads (
      parcel_id TEXT PRIMARY KEY,
      owner TEXT NOT NULL DEFAULT 'Owner not provided',
      address TEXT NOT NULL,
      city TEXT NOT NULL DEFAULT '',
      county TEXT NOT NULL,
      zip TEXT NOT NULL DEFAULT '',
      property_type TEXT NOT NULL DEFAULT 'Residential',
      property_class TEXT NOT NULL DEFAULT '',
      value BIGINT NOT NULL DEFAULT 0,
      equity INTEGER NOT NULL DEFAULT 0,
      ownership_years INTEGER NOT NULL DEFAULT 0,
      score INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'New',
      signals JSONB NOT NULL DEFAULT '[]'::jsonb,
      reason TEXT NOT NULL DEFAULT '',
      last_event TEXT NOT NULL DEFAULT '',
      mailing_address TEXT NOT NULL DEFAULT '',
      sale_price BIGINT NOT NULL DEFAULT 0,
      deed_date DATE,
      source TEXT NOT NULL DEFAULT 'NJ MOD-IV',
      imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS seller_leads_score_idx ON seller_leads (score DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS seller_leads_county_idx ON seller_leads (county)`;
  return sql;
}

export function requestIsAuthorized(request: Request) {
  const requiredKey = process.env.APP_ACCESS_KEY;
  if (!requiredKey) return true;
  return request.headers.get("x-app-key") === requiredKey;
}
