# NJ Seller Signal

New Jersey residential seller-intelligence MVP built with Next.js for Vercel.

## What is included

- County, ZIP, owner and address filtering
- Transparent seller-likelihood scores and evidence
- Property value, estimated equity and ownership-duration views
- Lead detail panel with suggested property-specific outreach
- Save/watch/contact workflow states
- Responsive desktop and mobile interface
- Native NJ MOD-IV fixed-width file parsing
- Chunked CSV/MOD-IV imports to serverless Postgres
- Zero-cost private browser storage using IndexedDB; no database account required for the pilot
- Protected import and real-record access using `APP_ACCESS_KEY`
- Downloadable normalized CSV template and CSV export
- Provider-ready environment variables for optional licensed property and contact data

The included records are fictional demonstration data. The low-cost pilot can import official New Jersey MOD-IV files or normalized CSV records. NJ-hosted data redacts protected owner names under Daniel's Law. Production outreach requires review of applicable privacy, fair-housing and do-not-call requirements.

## Pilot setup

1. Open **Import NJ data** and upload one extracted county MOD-IV file or the CSV template.
2. Leave the access key blank to keep records privately on that device at no cost.
3. Add Neon and `APP_ACCESS_KEY` later only if multiple users need shared data.

The schema is created automatically on the first authorized import.

## Local development

```bash
npm install
npm run dev
```
