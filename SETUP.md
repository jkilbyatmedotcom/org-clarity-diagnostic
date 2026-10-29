# Org Clarity Diagnostic — setup

## Environment variables (Vercel → Project → Settings → Environment Variables)

| Variable | Required | What it does |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Runs the diagnostic. Already set. |
| `RESEND_API_KEY` | For email | Sends the report to the user and a copy to you. Without it, no emails are sent but the diagnostic still works. |
| `HUBSPOT_TOKEN` | For CRM | HubSpot service key. Creates or updates each user as a contact and attaches a note with their results. |
| `OWNER_EMAIL` | No | Where your copy goes. Defaults to `james@jameskilbyadvisory.com.au`. |
| `REPORT_FROM_EMAIL` | No | Sender. Defaults to `James Kilby Advisory <reports@jameskilbyadvisory.com.au>`. Must be on a domain verified in Resend. |
| `ALLOWED_ORIGINS` | No | Extra comma-separated origins allowed to call the API. Not needed for the Framer embed, which loads the app from its own Vercel domain. |

After adding or changing variables, redeploy for them to take effect.

## Resend (email)
1. Sign up at resend.com and add the domain `jameskilbyadvisory.com.au`.
2. Add the DNS records Resend shows you at your domain registrar, then wait for it to say "Verified".
3. Create an API key with sending access and save it as `RESEND_API_KEY`.

## HubSpot (CRM)
HubSpot stopped allowing new private apps in October 2026. Use a Service Key instead (same Bearer-token usage, no code change).
1. HubSpot → Development → Keys → Service keys (some accounts: Settings → Integrations → Service Keys) → Create service key.
2. Scopes: `crm.objects.contacts.read`, `crm.objects.contacts.write` (plus a notes scope if your account lists one).
3. Create, open the key, click Show → Copy, and save it as `HUBSPOT_TOKEN`.

## How delivery works
- The diagnostic runs on the server with a fixed prompt, model and token limit. The browser only sends the user's answers.
- When the report is ready, the server sends two emails (to the user, and a copy to you with their details, reply-to set to them) and upserts them in HubSpot with a note.
- If any delivery step fails, it is logged in Vercel's function logs and the user still sees their report.

## Purpose–Market Alignment (optional website field)
- If a user enters their website, the server reads the homepage plus up to two About/Services pages as plain text (capped at ~3,500 tokens) and runs a second, smaller Claude call in parallel with the main diagnostic.
- Adds roughly US$0.02 per diagnostic that includes a website. No extra environment variables are needed.
- Only public web addresses are fetched; private and internal network addresses are refused, including via redirects.
- If the site can't be read (blocked, too little text, JavaScript-only pages), the report shows a short note and everything else is unaffected.
- Site reads are cached per server instance for 30 days.

## ABN Lookup (optional ABN field)
- Register for a free ABN Lookup GUID at https://abr.business.gov.au/Tools/WebServices and save it as `ABR_GUID`. Without it, the lookup is skipped and nothing else changes.
- If the user enters an ABN, the report header shows their legal name, ABN, years registered and state, and the details go into the HubSpot note and your lead email.
- If no ABN is entered, the tool searches the register by organisation name. It only accepts a clear-cut match, never shows a name match to the user, and flags it in your copy as "matched by name, please verify".
- "Years registered" comes from the date the ABN's current status took effect, which is usually, but not always, when the business started.

## Decision rights (from the JDs)
The diagnostic reads each JD against seven decision areas (pricing or discounts, hiring, spending above a limit, complaints or refunds, rosters and allocation, suppliers, new products or offers) and marks each role's authority as stated, implied or not covered. The same area codes are used by the culture and leader surveys, so the JD view compares directly with what leaders intend and what staff experience. The output is checked and cleaned on the server (`lib/decisionRights.js`); a malformed answer drops the section rather than breaking the report. The main call's output budget is 10,000 tokens to make room for the grid.
