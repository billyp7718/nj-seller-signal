"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Database, Download, FileUp, KeyRound, LoaderCircle, X } from "lucide-react";
import { parseCsv, parseModiv, type ImportLead } from "@/lib/modiv";

type Props = {
  onClose: () => void;
  onImported: (accessKey: string) => Promise<void>;
};

export default function ImportDialog({ onClose, onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ImportLead[]>([]);
  const [accessKey, setAccessKey] = useState("");
  const [status, setStatus] = useState<"idle" | "reading" | "uploading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);

  async function selectFile(file?: File) {
    if (!file) return;
    setStatus("reading");
    setFileName(file.name);
    setMessage("");
    try {
      const text = await file.text();
      const parsed = file.name.toLowerCase().endsWith(".csv") ? parseCsv(text) : parseModiv(text);
      setRows(parsed);
      setStatus(parsed.length ? "idle" : "error");
      if (!parsed.length) setMessage("No residential property records were found. Use an NJ MOD-IV text file or the CSV template.");
    } catch {
      setStatus("error");
      setMessage("The file could not be read.");
    }
  }

  async function upload() {
    if (!rows.length) return;
    setStatus("uploading");
    setMessage("");
    setProgress(0);
    try {
      const chunkSize = 250;
      let imported = 0;
      for (let index = 0; index < rows.length; index += chunkSize) {
        const response = await fetch("/api/import", {
          method: "POST",
          headers: { "content-type": "application/json", "x-app-key": accessKey },
          body: JSON.stringify({ rows: rows.slice(index, index + chunkSize) }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Import failed");
        imported += result.imported;
        setProgress(Math.round((Math.min(index + chunkSize, rows.length) / rows.length) * 100));
      }
      setStatus("done");
      setMessage(`${imported.toLocaleString()} NJ property records are now available in the opportunity radar.`);
      await onImported(accessKey);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Import failed");
    }
  }

  return (
    <div className="panel-backdrop import-backdrop" onMouseDown={onClose}>
      <section className="import-dialog" onMouseDown={(event) => event.stopPropagation()} aria-modal="true" role="dialog" aria-labelledby="import-title">
        <div className="panel-header">
          <div><span className="eyebrow">Low-cost data pilot</span><h2 id="import-title">Import NJ property records</h2><p>Load a county MOD-IV text file or a normalized CSV. The browser scores records before upload.</p></div>
          <button className="icon-button" onClick={onClose} aria-label="Close import"><X size={20} /></button>
        </div>

        <div className="import-source">
          <div className="source-step"><span>1</span><div><strong>Get the public data</strong><p>Download the current MOD-IV ZIP from the NJ Division of Taxation and extract a county text file.</p><a href="https://www.nj.gov/treasury/taxation/lpt/statdata.shtml" target="_blank" rel="noreferrer">Open official NJ files</a></div></div>
          <div className="source-step"><span>2</span><div><strong>Select a file</strong><p>For the first test, use one county or the provided CSV template.</p><div className="file-actions"><button className="secondary-button" onClick={() => inputRef.current?.click()}><FileUp size={17} />Choose file</button><a className="template-link" href="/nj-seller-signal-import-template.csv" download><Download size={15} />CSV template</a></div><input ref={inputRef} hidden type="file" accept=".csv,.txt,.dat" onChange={(event) => selectFile(event.target.files?.[0])} /></div></div>
        </div>

        {fileName && <div className="file-summary"><Database size={19} /><div><strong>{fileName}</strong><span>{rows.length.toLocaleString()} eligible residential records detected</span></div></div>}

        <label className="access-field"><span><KeyRound size={16} />Pilot access key</span><input type="password" value={accessKey} onChange={(event) => setAccessKey(event.target.value)} placeholder="Enter the key stored in Vercel" autoComplete="current-password" /></label>

        {status === "uploading" && <div className="import-progress"><div><span style={{ width: `${progress}%` }} /></div><p>Importing and updating records… {progress}%</p></div>}
        {message && <div className={`import-message ${status}`}><CheckCircle2 size={18} /><span>{message}</span></div>}

        <div className="import-notice"><strong>Privacy safeguard</strong><p>NJ-hosted datasets redact protected owner names. Do not upload purchased contact records until this app is access-controlled and your outreach process has been reviewed for compliance.</p></div>
        <div className="dialog-actions"><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" onClick={upload} disabled={!rows.length || !accessKey || status === "uploading" || status === "done"}>{status === "uploading" && <LoaderCircle className="spin" size={17} />}{status === "done" ? "Import complete" : "Import records"}</button></div>
      </section>
    </div>
  );
}
