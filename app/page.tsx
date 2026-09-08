"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell, ChevronDown, Download, FileUp, Filter, Home, LayoutDashboard, ListFilter, Mail,
  Map, MapPin, MessageSquareText, MoreHorizontal, Phone, Search, SlidersHorizontal,
  Sparkles, Target, TrendingUp, Users, X
} from "lucide-react";
import { counties, leads, type Lead } from "@/lib/leads";
import ImportDialog from "@/components/ImportDialog";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function Score({ value }: { value: number }) {
  const level = value >= 90 ? "hot" : value >= 80 ? "warm" : "cool";
  return <span className={`score ${level}`}><span>{value}</span>/100</span>;
}

function LeadPanel({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const outreach = `Hi ${lead.owner.split(" ")[0]}, a nearby home recently sold and your property at ${lead.address} may now be worth approximately ${money.format(lead.value)}. I would be happy to prepare a no-pressure local market analysis if knowing the current value would be useful.`;

  async function copyOutreach() {
    await navigator.clipboard.writeText(outreach);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="panel-backdrop" onMouseDown={onClose}>
      <aside className="lead-panel" onMouseDown={(event) => event.stopPropagation()} aria-label="Lead details">
        <div className="panel-header">
          <div><span className="eyebrow">Seller opportunity</span><h2>{lead.address}</h2><p>{lead.city}, NJ {lead.zip}</p></div>
          <button className="icon-button" onClick={onClose} aria-label="Close lead details"><X size={20} /></button>
        </div>

        <div className="panel-score">
          <Score value={lead.score} />
          <div><strong>{lead.score >= 90 ? "Priority lead" : lead.score >= 80 ? "Strong signal" : "Worth monitoring"}</strong><p>{lead.reason}</p></div>
        </div>

        <div className="property-facts">
          <div><span>Estimated value</span><strong>{money.format(lead.value)}</strong></div>
          <div><span>Estimated equity</span><strong>{lead.equity}%</strong></div>
          <div><span>Years owned</span><strong>{lead.ownershipYears}</strong></div>
          <div><span>Property</span><strong>{lead.beds || lead.baths ? `${lead.beds} bd · ${lead.baths} ba` : lead.propertyType}</strong></div>
        </div>

        <section className="panel-section">
          <div className="section-heading"><h3>Why this lead surfaced</h3><span>{lead.source || lead.lastEvent}</span></div>
          <div className="signal-list">{lead.signals.map((signal) => <span key={signal}>{signal}</span>)}</div>
        </section>

        <section className="panel-section">
          <div className="section-heading"><h3>Owner</h3><span>Public and licensed data</span></div>
          <div className="owner-row"><div className="avatar">{lead.owner.split(" ").map((part) => part[0]).join("")}</div><div><strong>{lead.owner}</strong><p>Owner of record</p></div></div>
          <div className="contact-row">
            <button disabled={!lead.phone}><Phone size={16} />{lead.phone || "Enrich phone"}</button>
            <button disabled={!lead.email}><Mail size={16} />{lead.email || "Enrich email"}</button>
          </div>
        </section>

        <section className="panel-section outreach">
          <div className="section-heading"><h3><Sparkles size={17} /> Suggested outreach</h3><span>Nearby-sale angle</span></div>
          <p>{outreach}</p>
          <button className="secondary-button" onClick={copyOutreach}><MessageSquareText size={16} />{copied ? "Copied" : "Copy message"}</button>
        </section>
      </aside>
    </div>
  );
}

export default function Dashboard() {
  const [leadData, setLeadData] = useState<Lead[]>(leads);
  const [dataMode, setDataMode] = useState<"demo" | "database" | "locked">("demo");
  const [county, setCounty] = useState("All counties");
  const [query, setQuery] = useState("");
  const [minimumScore, setMinimumScore] = useState(70);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [signalsOpen, setSignalsOpen] = useState(false);
  const [activeSignals, setActiveSignals] = useState<string[]>([]);
  const [saved, setSaved] = useState<number[]>([]);
  const [importOpen, setImportOpen] = useState(false);

  const loadLeads = useCallback(async (accessKey = "") => {
    try {
      const response = await fetch("/api/leads", { headers: { "x-app-key": accessKey }, cache: "no-store" });
      if (response.status === 401) { setDataMode("locked"); return; }
      const result = await response.json();
      if (result.configured && result.leads?.length) {
        setLeadData(result.leads);
        setDataMode("database");
      } else {
        setLeadData(leads);
        setDataMode("demo");
      }
    } catch {
      setLeadData(leads);
      setDataMode("demo");
    }
  }, []);

  useEffect(() => { void loadLeads(); }, [loadLeads]);

  const signalOptions = ["High equity", "Absentee owner", "Expired listing", "Long ownership", "Nearby sale"];
  const visibleLeads = useMemo(() => leadData.filter((lead) => {
    const matchesCounty = county === "All counties" || lead.county === county;
    const haystack = `${lead.owner} ${lead.address} ${lead.city} ${lead.zip}`.toLowerCase();
    const matchesQuery = haystack.includes(query.toLowerCase());
    const matchesScore = lead.score >= minimumScore;
    const matchesSignal = activeSignals.length === 0 || activeSignals.some((signal) =>
      lead.signals.some((leadSignal) => signal === "Long ownership" ? leadSignal.includes("years owned") : leadSignal === signal)
    );
    return matchesCounty && matchesQuery && matchesScore && matchesSignal;
  }), [county, query, minimumScore, activeSignals, leadData]);

  const totalValue = visibleLeads.reduce((sum, lead) => sum + lead.value, 0);
  const priorityCount = visibleLeads.filter((lead) => lead.score >= 85).length;

  function exportVisible() {
    const header = ["parcel_id", "owner", "address", "city", "county", "zip", "score", "assessed_value", "years_owned", "signals"];
    const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
    const content = [header.join(","), ...visibleLeads.map((lead) => [lead.parcelId || lead.id, lead.owner, lead.address, lead.city, lead.county, lead.zip, lead.score, lead.value, lead.ownershipYears, lead.signals.join("; ")].map(escape).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "nj-seller-opportunities.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function toggleSignal(signal: string) {
    setActiveSignals((current) => current.includes(signal) ? current.filter((item) => item !== signal) : [...current, signal]);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><Home size={18} /></div><div><strong>NJ Seller</strong><span>Signal</span></div></div>
        <nav>
          <a className="active" href="#"><LayoutDashboard size={19} />Opportunities</a>
          <a href="#map"><Map size={19} />Territory map</a>
          <a href="#campaigns"><Target size={19} />Campaigns</a>
          <a href="#contacts"><Users size={19} />Contacts</a>
          <a href="#alerts"><Bell size={19} />Alerts<span className="nav-count">3</span></a>
        </nav>
        <div className="sidebar-note"><TrendingUp size={18} /><strong>New Jersey focus</strong><p>21 counties monitored. Data connections are ready to configure.</p></div>
        <div className="account"><div className="avatar dark">BP</div><div><strong>Bill Pantaleo</strong><span>Administrator</span></div><MoreHorizontal size={18} /></div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div><span className="eyebrow">New Jersey seller intelligence</span><h1>Seller opportunities</h1><p>Prioritize homeowners with transparent, property-level selling signals.</p></div>
          <div className="top-actions"><button className="secondary-button" onClick={exportVisible}><Download size={17} />Export</button><button className="primary-button" onClick={() => setImportOpen(true)}><FileUp size={17} />Import NJ data</button></div>
        </header>

        <section className="metrics" aria-label="Territory overview">
          <article><span>Priority opportunities</span><strong>{priorityCount.toLocaleString()}</strong><em>Score of 85 or higher</em></article>
          <article><span>Property value represented</span><strong>{money.format(totalValue)}</strong><em>Public assessment or imported value</em></article>
          <article><span>Potential commission</span><strong>{money.format(totalValue * .025)}</strong><em>Illustrative at 2.5%</em></article>
          <article><span>Records in view</span><strong>{visibleLeads.length.toLocaleString()}</strong><em>{dataMode === "database" ? "Imported pilot records" : "Demonstration records"}</em></article>
        </section>

        <section className="radar-card">
          <div className="radar-heading">
            <div><h2>Opportunity radar</h2><p>Filter by territory and the evidence behind each score.</p></div>
            <button className={`data-badge ${dataMode}`} onClick={() => setImportOpen(true)}><span />{dataMode === "database" ? "NJ public data" : dataMode === "locked" ? "Data locked" : "Demo data"}</button>
          </div>
          <div className="filters">
            <label className="search"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search owner, address or ZIP" /></label>
            <label className="select-wrap"><MapPin size={17} /><select value={county} onChange={(e) => setCounty(e.target.value)}>{counties.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={16} /></label>
            <label className="score-filter"><SlidersHorizontal size={17} /><span>Score {minimumScore}+</span><input type="range" min="70" max="95" step="5" value={minimumScore} onChange={(e) => setMinimumScore(Number(e.target.value))} /></label>
            <div className="signal-filter">
              <button onClick={() => setSignalsOpen((open) => !open)}><ListFilter size={17} />Signals{activeSignals.length > 0 && <b>{activeSignals.length}</b>}<ChevronDown size={16} /></button>
              {signalsOpen && <div className="signal-menu">{signalOptions.map((signal) => <label key={signal}><input type="checkbox" checked={activeSignals.includes(signal)} onChange={() => toggleSignal(signal)} />{signal}</label>)}</div>}
            </div>
          </div>

          <div className="table-meta"><span><strong>{visibleLeads.length}</strong> opportunities shown</span><button onClick={() => { setCounty("All counties"); setQuery(""); setMinimumScore(70); setActiveSignals([]); }}><Filter size={15} />Clear filters</button></div>
          <div className="lead-table" role="table" aria-label="Seller opportunities">
            <div className="lead-row table-head" role="row"><span>Property & owner</span><span>Seller score</span><span>Value / equity</span><span>Top signals</span><span>Status</span><span /></div>
            {visibleLeads.map((lead) => (
              <div className="lead-row" role="row" key={lead.id} onClick={() => setSelectedLead(lead)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setSelectedLead(lead)}>
                <div className="property-cell"><div className="property-icon"><Home size={19} /></div><div><strong>{lead.address}</strong><span>{lead.owner} · {lead.city}, NJ {lead.zip}</span></div></div>
                <div><Score value={lead.score} /></div>
                <div className="value-cell"><strong>{money.format(lead.value)}</strong><span>{lead.equity}% equity</span></div>
                <div className="tags"><span>{lead.signals[0]}</span><span>{lead.signals[1]}</span></div>
                <div><span className={`status ${lead.status.toLowerCase()}`}>{lead.status}</span></div>
                <div><button className={`save-button ${saved.includes(lead.id) ? "saved" : ""}`} onClick={(event) => { event.stopPropagation(); setSaved((current) => current.includes(lead.id) ? current.filter((id) => id !== lead.id) : [...current, lead.id]); }}>{saved.includes(lead.id) ? "Saved" : "Save"}</button></div>
              </div>
            ))}
            {visibleLeads.length === 0 && <div className="empty-state"><Search size={26} /><strong>No opportunities match these filters</strong><p>Try expanding the county, score or signal selection.</p></div>}
          </div>
        </section>
        <footer><span>Scores explain the evidence used. Verify property and contact records before outreach.</span><a href="#compliance">NJ compliance & data policy</a></footer>
      </section>
      {selectedLead && <LeadPanel lead={selectedLead} onClose={() => setSelectedLead(null)} />}
      {importOpen && <ImportDialog onClose={() => setImportOpen(false)} onImported={async (key) => { await loadLeads(key); }} />}
    </main>
  );
}
