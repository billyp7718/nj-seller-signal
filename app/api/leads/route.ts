import { NextResponse } from "next/server";
import { ensureSchema, requestIsAuthorized } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!requestIsAuthorized(request)) {
    return NextResponse.json({ error: "Access key required" }, { status: 401 });
  }

  const sql = await ensureSchema();
  if (!sql) return NextResponse.json({ configured: false, leads: [] });

  const rows = await sql`
    SELECT parcel_id, owner, address, city, county, zip, property_type,
      property_class, value, equity, ownership_years, score, status,
      signals, reason, last_event, source
    FROM seller_leads
    ORDER BY score DESC, updated_at DESC
    LIMIT 1000
  `;

  return NextResponse.json({
    configured: true,
    leads: rows.map((row, index) => ({
      id: index + 1000,
      parcelId: row.parcel_id,
      owner: row.owner,
      address: row.address,
      city: row.city,
      county: row.county,
      zip: row.zip,
      propertyType: row.property_type,
      propertyClass: row.property_class,
      beds: 0,
      baths: 0,
      value: Number(row.value),
      equity: row.equity,
      ownershipYears: row.ownership_years,
      score: row.score,
      status: row.status,
      signals: row.signals,
      reason: row.reason,
      lastEvent: row.last_event,
      source: row.source,
    })),
  });
}
