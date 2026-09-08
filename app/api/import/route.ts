import { NextResponse } from "next/server";
import { ensureSchema, requestIsAuthorized } from "@/lib/db";

export const dynamic = "force-dynamic";

type ImportRow = {
  parcelId: string;
  owner?: string;
  address: string;
  city?: string;
  county: string;
  zip?: string;
  propertyType?: string;
  propertyClass?: string;
  value?: number;
  equity?: number;
  ownershipYears?: number;
  score?: number;
  signals?: string[];
  reason?: string;
  lastEvent?: string;
  mailingAddress?: string;
  salePrice?: number;
  deedDate?: string | null;
  source?: string;
};

export async function POST(request: Request) {
  if (!requestIsAuthorized(request)) {
    return NextResponse.json({ error: "The import access key is incorrect." }, { status: 401 });
  }

  const sql = await ensureSchema();
  if (!sql) {
    return NextResponse.json({ error: "Connect a Neon database in Vercel before importing records." }, { status: 503 });
  }

  const body = await request.json() as { rows?: ImportRow[] };
  const rows = (body.rows ?? []).slice(0, 500).filter((row) => row.parcelId && row.address && row.county);
  if (!rows.length) return NextResponse.json({ error: "No valid property rows were found." }, { status: 400 });

  const payload = rows.map((row) => ({
    parcel_id: String(row.parcelId).slice(0, 80),
    owner: String(row.owner || "Owner not provided").slice(0, 160),
    address: String(row.address).slice(0, 180),
    city: String(row.city || "").slice(0, 100),
    county: String(row.county).slice(0, 40),
    zip: String(row.zip || "").slice(0, 10),
    property_type: String(row.propertyType || "Residential").slice(0, 60),
    property_class: String(row.propertyClass || "").slice(0, 12),
    value: Math.max(0, Math.round(Number(row.value) || 0)),
    equity: Math.min(100, Math.max(0, Math.round(Number(row.equity) || 0))),
    ownership_years: Math.max(0, Math.round(Number(row.ownershipYears) || 0)),
    score: Math.min(100, Math.max(0, Math.round(Number(row.score) || 0))),
    signals: JSON.stringify(Array.isArray(row.signals) ? row.signals.slice(0, 12) : []),
    reason: String(row.reason || "Imported NJ public-record opportunity.").slice(0, 500),
    last_event: String(row.lastEvent || "Imported today").slice(0, 160),
    mailing_address: String(row.mailingAddress || "").slice(0, 240),
    sale_price: Math.max(0, Math.round(Number(row.salePrice) || 0)),
    deed_date: row.deedDate || null,
    source: String(row.source || "NJ MOD-IV").slice(0, 80),
  }));

  await sql`
    INSERT INTO seller_leads (
      parcel_id, owner, address, city, county, zip, property_type, property_class,
      value, equity, ownership_years, score, signals, reason, last_event,
      mailing_address, sale_price, deed_date, source
    )
    SELECT parcel_id, owner, address, city, county, zip, property_type, property_class,
      value, equity, ownership_years, score, signals::jsonb, reason, last_event,
      mailing_address, sale_price, deed_date::date, source
    FROM json_to_recordset(${JSON.stringify(payload)}::json) AS x(
      parcel_id text, owner text, address text, city text, county text, zip text,
      property_type text, property_class text, value bigint, equity integer,
      ownership_years integer, score integer, signals text, reason text,
      last_event text, mailing_address text, sale_price bigint, deed_date text, source text
    )
    ON CONFLICT (parcel_id) DO UPDATE SET
      owner = EXCLUDED.owner,
      address = EXCLUDED.address,
      city = EXCLUDED.city,
      county = EXCLUDED.county,
      zip = EXCLUDED.zip,
      property_type = EXCLUDED.property_type,
      property_class = EXCLUDED.property_class,
      value = EXCLUDED.value,
      equity = EXCLUDED.equity,
      ownership_years = EXCLUDED.ownership_years,
      score = EXCLUDED.score,
      signals = EXCLUDED.signals,
      reason = EXCLUDED.reason,
      last_event = EXCLUDED.last_event,
      mailing_address = EXCLUDED.mailing_address,
      sale_price = EXCLUDED.sale_price,
      deed_date = EXCLUDED.deed_date,
      source = EXCLUDED.source,
      updated_at = NOW()
  `;

  return NextResponse.json({ imported: rows.length });
}
