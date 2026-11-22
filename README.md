# Explainable and Fair Resume Analysis

A MERN application for deterministic resume-to-job-description evaluation, with sentence-level evidence, ATS and formatting indicators, counterfactual name-masking audit, history, comparison, PDF reports, and an optional user-triggered AI advisory.

## Local setup (macOS)

Requirements: Node.js 20 or newer, npm, and Docker Desktop (or a local MongoDB 7-compatible server).

1. Copy `server/.env.example` to `server/.env`. The defaults work with the included MongoDB compose service.
2. Start MongoDB with `docker compose up -d mongo`. Alternatively, start your local MongoDB and set `MONGODB_URI` in `server/.env`.
3. From the project root, run `npm install`, then `npm run dev`.
4. Open [http://localhost:5173](http://localhost:5173). The API runs at [http://localhost:5001](http://localhost:5001).

To production-build the frontend, run `npm run build`; start the API with `npm start`. The API serves JSON only; deploy the generated `client/dist` separately or configure a reverse proxy.

## What the score means

The overall score is the weighted mean of three deterministic 0–100 pillars: job-description relevance (TF-IDF-style term importance, BM25-style frequency saturation, and coverage), ATS/template signals, and document readability/formatting signals. Weights can be adjusted and are normalized to 100%. The result is a decision-support signal, not a hiring recommendation. Sentence evidence is derived from the uploaded text and matched job-description terms.

The fairness tool performs a *within-resume name-masking sensitivity check*. It reports score invariance; it is not demographic parity, a causal fairness guarantee, or evidence that the system is fair across applicants. Names are masked heuristically, and no demographic attributes are inferred.

## Privacy and safety

This educational prototype has no authentication or tenant isolation. Anyone who can reach the API can view or delete stored analysis history. Do not expose it to the public internet or upload real applicants' resumes without adding access control, consent, retention/deletion policies, and a privacy/security review. Extracted resume text and analysis results are stored in MongoDB so history, fairness checks, and advisory remain available. Uploaded files are processed in memory and are not written to `server/uploads`.

The advisory is disabled unless `OPENAI_API_KEY` is configured and the user explicitly requests it. That action sends the saved resume text and job description to the configured OpenAI API; do not enable it for sensitive data without appropriate consent and governance. Its output is non-authoritative and does not change deterministic scores.

## API overview

- `GET /api/health` — service/database status
- `POST /api/analyses` — multipart `resume` + `jobDescription`; optional JSON `weights`
- `GET /api/analyses` and `GET /api/analyses/:id` — persisted history and details
- `DELETE /api/analyses/:id` — remove an analysis
- `POST /api/analyses/:id/fairness` — compute name-masking sensitivity audit
- `POST /api/analyses/:id/advisory` — request optional advisory
- `GET /api/analyses/:id/report` — download a PDF report
- `POST /api/analyses/compare` — JSON `{ "ids": ["...", "..."] }`, with two analysis IDs

`npm test` runs server tests; `npm run build` validates the frontend.
