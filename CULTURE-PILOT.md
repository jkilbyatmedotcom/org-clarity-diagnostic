# Culture survey pilot (Enabling Culture Fingerprint v0)

Survey link: `https://<your-app>.vercel.app/culture?pilot=<code>` (e.g. `?pilot=padre`).
Wording source of truth: the "Enabling Culture Fingerprint — Survey Item Bank v0" doc. Items live in `lib/culture/instrument.js`; bump `INSTRUMENT_VERSION` whenever wording changes.

## One-off setup (Vercel)
1. **Storage:** Vercel → project → Storage → Create / Connect → **Upstash for Redis** (free tier). Connect it to this project for Production and Preview. Vercel adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL` / `_TOKEN`). Without storage, the survey refuses submissions rather than losing them.
2. **Export key:** add `CULTURE_ADMIN_KEY`, a long random string (Secret), for Production and Preview.
3. Redeploy.

## Adding a pilot organisation
Edit `lib/culture/pilots.js`: copy an entry, set `org`, the real `teams` list, 4–6 `decisionAreas` (PRC, HIR, SPD, CMP, SCH, SUP, NEW) and `spendAmount`. Commit and redeploy.

## Downloading responses
`https://<your-app>.vercel.app/api/culture-export?pilot=padre&key=<CULTURE_ADMIN_KEY>` downloads a CSV (one row per response, one column per item). Add `&format=json` for the raw records.

## Results view
`https://<your-app>.vercel.app/culture/results`. Enter `CULTURE_ADMIN_KEY` (kept only for that browser tab), pick the organisation. Shows aggregates only:
- **Fingerprint:** staff points split and scenario profile against the owner's view of now and of what the business needs, on the 8-style circumplex.
- **Fit scores:** 50 × (1 + r) on centred profiles. Bands are provisional until pilot data calibrates them.
- **By site and level:** groups under 5 are pooled into "Other sites (combined)"; a pool still under 5 is withheld.
- **Decision rights:** organisation level only. Owner's answer vs staff, "don't know" share, "check with the owner" share.
- **Data quality:** completion time, rushing and concentration flags, per-statement spread, order effect, scenario N/A rates and options nobody picks.
Nothing shows for staff until at least 5 staff have responded. "Print / save PDF" gives a clean copy for a debrief.

## Privacy
- No names or emails collected. Team, role and tenure only.
- Respondents are told the organisation sees team-level results only (never under five people) and that JKA sees anonymous responses.
- Draft answers are saved in the respondent's own browser until they submit.

## Embedding in Framer
Add an Embed (URL type) pointing at the survey link, width Fill, height around 900px; or link to it directly — on phones a direct link is the better experience.
