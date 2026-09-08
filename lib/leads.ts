export type Lead = {
  id: number;
  parcelId?: string;
  owner: string;
  address: string;
  city: string;
  county: string;
  zip: string;
  propertyType: string;
  beds: number;
  baths: number;
  value: number;
  equity: number;
  ownershipYears: number;
  score: number;
  status: "New" | "Watching" | "Contacted";
  signals: string[];
  reason: string;
  lastEvent: string;
  phone?: string;
  email?: string;
  propertyClass?: string;
  source?: string;
};

export const counties = [
  "All counties", "Atlantic", "Bergen", "Burlington", "Camden", "Cape May", "Essex",
  "Gloucester", "Hudson", "Hunterdon", "Mercer", "Middlesex", "Monmouth", "Morris",
  "Ocean", "Passaic", "Salem", "Somerset", "Sussex", "Union", "Warren"
];

export const leads: Lead[] = [
  {
    id: 1, owner: "Patricia Morgan", address: "17 Cedar Ridge Lane", city: "Princeton", county: "Mercer", zip: "08540",
    propertyType: "Single family", beds: 4, baths: 3, value: 938000, equity: 82, ownershipYears: 21, score: 94, status: "New",
    signals: ["21 years owned", "High equity", "Empty-nester profile", "Nearby sale"],
    reason: "Long ownership, substantial estimated equity and a recent comparable sale within 0.3 miles.", lastEvent: "Comparable sold 5 days ago"
  },
  {
    id: 2, owner: "David Chen", address: "284 Shore Point Drive", city: "Red Bank", county: "Monmouth", zip: "07701",
    propertyType: "Condo", beds: 2, baths: 2, value: 612000, equity: 71, ownershipYears: 14, score: 89, status: "Watching",
    signals: ["Absentee owner", "High equity", "Rental removed"],
    reason: "Owner mailing address differs from the property and the long-running rental listing was removed.", lastEvent: "Rental listing removed 9 days ago",
    phone: "(732) 555-0184"
  },
  {
    id: 3, owner: "Maria Alvarez", address: "61 Hawthorne Avenue", city: "Montclair", county: "Essex", zip: "07042",
    propertyType: "Single family", beds: 3, baths: 2, value: 824000, equity: 64, ownershipYears: 11, score: 86, status: "New",
    signals: ["Expired listing", "Price reduction", "High equity"],
    reason: "A prior listing expired after two reductions; estimated equity leaves room for a fresh pricing strategy.", lastEvent: "Listing expired 12 days ago",
    email: "m.alvarez@example.com"
  },
  {
    id: 4, owner: "Robert Walker", address: "9 Maple Court", city: "Cherry Hill", county: "Camden", zip: "08003",
    propertyType: "Single family", beds: 4, baths: 2.5, value: 574000, equity: 77, ownershipYears: 18, score: 82, status: "Contacted",
    signals: ["18 years owned", "High equity", "Renovation permit"],
    reason: "Long ownership and a recently closed kitchen renovation permit may indicate preparation for market.", lastEvent: "Permit closed 18 days ago",
    phone: "(856) 555-0146", email: "rwalker@example.com"
  },
  {
    id: 5, owner: "Susan Patel", address: "145 River Road", city: "Edgewater", county: "Bergen", zip: "07020",
    propertyType: "Townhouse", beds: 3, baths: 3, value: 1015000, equity: 58, ownershipYears: 9, score: 79, status: "New",
    signals: ["Out-of-state owner", "Nearby sale", "Equity growth"],
    reason: "Out-of-state mailing address and strong recent appreciation create a timely investment-property conversation.", lastEvent: "Nearby sale 23 days ago"
  },
  {
    id: 6, owner: "James Thompson", address: "33 Seabreeze Terrace", city: "Toms River", county: "Ocean", zip: "08753",
    propertyType: "Single family", beds: 3, baths: 2, value: 489000, equity: 69, ownershipYears: 16, score: 76, status: "Watching",
    signals: ["Tax mailing mismatch", "16 years owned", "High equity"],
    reason: "Tax mailing mismatch and long ownership suggest an absentee or inherited property worth monitoring.", lastEvent: "Tax record updated 31 days ago"
  }
];
