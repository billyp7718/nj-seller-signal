import type { Lead } from "./leads";

const countyByCode: Record<string, string> = {
  "01": "Atlantic", "02": "Bergen", "03": "Burlington", "04": "Camden",
  "05": "Cape May", "06": "Cumberland", "07": "Essex", "08": "Gloucester",
  "09": "Hudson", "10": "Hunterdon", "11": "Mercer", "12": "Middlesex",
  "13": "Monmouth", "14": "Morris", "15": "Ocean", "16": "Passaic",
  "17": "Salem", "18": "Somerset", "19": "Sussex", "20": "Union", "21": "Warren"
};

export type ImportLead = Lead & {
  parcelId: string;
  propertyClass: string;
  mailingAddress: string;
  salePrice: number;
  deedDate: string | null;
  source: string;
};

const clean = (value: string) => value.trim().replace(/\s+/g, " ");
const numberAt = (line: string, start: number, end: number) => Number(clean(line.slice(start - 1, end)).replace(/[^0-9.-]/g, "")) || 0;

function parseDate(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 6 || digits === "000000") return null;
  const month = Number(digits.slice(0, 2));
  const day = Number(digits.slice(2, 4));
  const shortYear = Number(digits.slice(4, 6));
  const year = shortYear <= 30 ? 2000 + shortYear : 1900 + shortYear;
  if (!month || month > 12 || !day || day > 31) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function scoreLead(ownershipYears: number, absentee: boolean, value: number, yearBuilt: number, salePrice: number) {
  let score = 35;
  const signals: string[] = [];
  if (ownershipYears >= 20) { score += 28; signals.push(`${ownershipYears} years owned`); }
  else if (ownershipYears >= 15) { score += 22; signals.push(`${ownershipYears} years owned`); }
  else if (ownershipYears >= 10) { score += 14; signals.push(`${ownershipYears} years owned`); }
  if (absentee) { score += 18; signals.push("Mailing address differs"); }
  if (value >= 750000) { score += 8; signals.push("High-value property"); }
  else if (value >= 400000) { score += 5; signals.push("Strong assessed value"); }
  if (yearBuilt > 0 && yearBuilt < 1985) { score += 6; signals.push(`Built ${yearBuilt}`); }
  if (salePrice > 0) signals.push("Recorded sale history");
  return { score: Math.min(100, score), signals: signals.length ? signals : ["NJ residential record"] };
}

function propertyType(propertyClass: string) {
  if (propertyClass.startsWith("2")) return "Residential";
  if (propertyClass.startsWith("4A")) return "Commercial";
  return "Property";
}

export function parseModiv(text: string): ImportLead[] {
  const currentYear = new Date().getFullYear();
  return text.split(/\r?\n/).filter((line) => line.length >= 447).map((line, index) => {
    const district = clean(line.slice(0, 4));
    const block = clean(line.slice(4, 13));
    const lot = clean(line.slice(13, 22));
    const qualifier = clean(line.slice(22, 33));
    const propertyClass = clean(line.slice(55, 58));
    const address = clean(line.slice(58, 83));
    const owner = clean(line.slice(175, 210)) || "Owner name redacted";
    const mailingStreet = clean(line.slice(210, 235));
    const mailingCityState = clean(line.slice(235, 260));
    const mailingZip = clean(line.slice(260, 269));
    const deedDate = parseDate(line.slice(306, 312));
    const salePrice = numberAt(line, 313, 321);
    const yearBuilt = numberAt(line, 416, 419);
    const value = numberAt(line, 439, 447);
    const ownershipYears = deedDate ? Math.max(0, currentYear - Number(deedDate.slice(0, 4))) : 0;
    const absentee = Boolean(mailingStreet && address && clean(mailingStreet).toLowerCase() !== clean(address).toLowerCase());
    const scored = scoreLead(ownershipYears, absentee, value, yearBuilt, salePrice);
    const county = countyByCode[district.slice(0, 2)] || "Unknown";

    return {
      id: index + 100000,
      parcelId: `${district}-${block}-${lot}-${qualifier || "_"}`,
      owner,
      address: address || `Block ${block}, Lot ${lot}`,
      city: `District ${district}`,
      county,
      zip: "",
      propertyType: propertyType(propertyClass),
      propertyClass,
      beds: 0,
      baths: 0,
      value,
      equity: 0,
      ownershipYears,
      score: scored.score,
      status: "New" as const,
      signals: scored.signals,
      reason: `Public-record score based on ${scored.signals.join(", ").toLowerCase()}.`,
      lastEvent: deedDate ? `Deed recorded ${deedDate}` : "Imported from NJ MOD-IV",
      mailingAddress: clean(`${mailingStreet} ${mailingCityState} ${mailingZip}`),
      salePrice,
      deedDate,
      source: "NJ MOD-IV",
    };
  }).filter((lead) => lead.county !== "Unknown" && lead.address && (lead.propertyClass.startsWith("2") || lead.propertyClass === "3A"));
}

function splitCsvLine(line: string) {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') { value += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { values.push(value.trim()); value = ""; }
    else value += char;
  }
  values.push(value.trim());
  return values;
}

export function parseCsv(text: string): ImportLead[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((header) => header.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const read = (values: string[], ...names: string[]) => {
    const index = headers.findIndex((header) => names.includes(header));
    return index >= 0 ? values[index] || "" : "";
  };

  return lines.slice(1).map((line, index) => {
    const values = splitCsvLine(line);
    const ownershipYears = Number(read(values, "ownershipyears", "yearsowned")) || 0;
    const value = Number(read(values, "value", "assessedvalue", "netvalue")) || 0;
    const absentee = ["yes", "true", "1"].includes(read(values, "absentee", "absenteeowner").toLowerCase());
    const scored = scoreLead(ownershipYears, absentee, value, Number(read(values, "yearbuilt")) || 0, Number(read(values, "saleprice")) || 0);
    const parcelId = read(values, "parcelid", "pin", "apn") || `CSV-${Date.now()}-${index}`;
    return {
      id: index + 200000,
      parcelId,
      owner: read(values, "owner", "ownername") || "Owner not provided",
      address: read(values, "address", "propertyaddress", "propertylocation"),
      city: read(values, "city", "municipality"),
      county: read(values, "county").replace(/ county$/i, ""),
      zip: read(values, "zip", "zipcode"),
      propertyType: read(values, "propertytype") || "Residential",
      propertyClass: read(values, "propertyclass", "class"),
      beds: Number(read(values, "beds", "bedrooms")) || 0,
      baths: Number(read(values, "baths", "bathrooms")) || 0,
      value,
      equity: Number(read(values, "equity", "equitypercent")) || 0,
      ownershipYears,
      score: scored.score,
      status: "New" as const,
      signals: scored.signals,
      reason: `Pilot score based on ${scored.signals.join(", ").toLowerCase()}.`,
      lastEvent: "Imported from CSV",
      mailingAddress: read(values, "mailingaddress"),
      salePrice: Number(read(values, "saleprice")) || 0,
      deedDate: read(values, "deeddate") || null,
      source: read(values, "source") || "CSV import",
    };
  }).filter((lead) => lead.address && lead.county);
}
