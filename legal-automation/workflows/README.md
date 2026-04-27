# Legal Automation Workflows

This folder contains the **27 production-ready workflow definitions** that power the
Flowstack3 legal-automation suite. Each `*.json` file is a self-contained
[n8n](https://n8n.io) workflow (schema compatible with n8n ≥ 1.0) and can be:

1. **imported into n8n** (Settings → Workflows → Import from file) and run
   immediately, or
2. **registered in the Flowstack3 backend** via `prisma seed` / the `/workflows`
   API – the slug, category and node count surfaced by `frontend/src/server/services/workflow-service`
   are taken directly from these files.

> The directory layout below maps 1:1 to the `WorkflowCategory` enum in
> `frontend/src/lib/validation.ts`.

## Directory layout

```
legal-automation/workflows/
├── client-lifecycle/          ← Mandanten-Onboarding & Dokumenten-Anforderungen
│   ├── onboarding-main.json
│   ├── onboarding-signature.json        (sub-workflow)
│   ├── onboarding-marketing.json        (sub-workflow)
│   ├── doc-request-main.json
│   ├── doc-request-intake.json          (sub-workflow)
│   ├── doc-request-processing.json      (sub-workflow)
│   ├── doc-request-reminder.json        (cron 09:00)
│   ├── noshow-detection.json            (cron */15 min)
│   └── noshow-response.json             (sub-workflow)
├── deadline-followup/         ← Fristen & Follow-up
│   ├── fristen-pruefung.json            (cron 06:00)
│   ├── fristen-erinnerung.json          (sub-workflow)
│   ├── fristen-eskalation.json          (sub-workflow)
│   ├── follow-up-main.json              (cron Mo-Fr 08:00)
│   └── follow-up-escalation.json        (sub-workflow)
├── meeting-protocols/         ← Protokolle & Freigabe
│   ├── protokoll-erstellung.json        (webhook)
│   ├── protokoll-freigabe.json          (sub-workflow)
│   ├── protokoll-aufgaben.json          (sub-workflow)
│   └── approval-subprocess.json         (generic sub-workflow)
├── review-reporting/          ← Bewertungen & Reports
│   ├── review-intake.json               (IMAP trigger)
│   ├── review-optimized.json            (cron */30 min, batched)
│   ├── review-response.json             (sub-workflow)
│   ├── bericht-datensammlung.json       (cron Mo 04:00)
│   ├── bericht-intern.json              (sub-workflow)
│   └── bericht-extern.json              (sub-workflow)
└── triage-error-handling/     ← Triage & Fehlerbehandlung
    ├── triage-main.json                 (IMAP trigger)
    ├── error-handler.json               (Error Trigger – globaler Handler)
    └── follow-up-error-handler.json     (Error Trigger – Follow-up Recovery)
```

## How the pieces fit together

- **Top-level workflows** (`*-main`, `*-erstellung`, `*-pruefung`, `*-intake`,
  `triage-main`) are triggered by webhooks, schedules, IMAP, or forms and
  orchestrate the sub-workflows.
- **Sub-workflows** (`onboarding-signature`, `approval-subprocess`,
  `fristen-eskalation`, …) each start with an
  `n8n-nodes-base.executeWorkflowTrigger` and are invoked via
  `n8n-nodes-base.executeWorkflow`. The parent passes its JSON payload through.
- **`error-handler.json`** is the workflow referenced by every other workflow's
  `settings.errorWorkflow` field. `follow-up-error-handler.json` adds
  follow-up–specific recovery (re-queue) before delegating to the global
  handler.
- **`triage-main.json`** classifies inbound mail with an LLM and dispatches into
  the corresponding domain workflow.

## Required environment variables

Every HTTP node uses `${env:...}` placeholders so the same JSON works in dev,
staging and production. Set the following on the n8n instance (or pass via
Docker `--env-file`):

| Variable | Purpose |
|---|---|
| `FLOWSTACK_API_URL` | Base URL of the Flowstack3 backend (e.g. `http://backend:4000`) |
| `FLOWSTACK_API_TOKEN` | Service JWT used as `Authorization: Bearer …` |
| `FLOWSTACK_SENDER_EMAIL` | From-address for SMTP sends |
| `OPS_EMAIL` | Mailbox the global error handler notifies |
| `PARTNER_EMAIL` | Partner mailbox for review escalations |
| `ONCALL_PHONE` | E.164 phone for critical SMS alerts |
| `OCR_SERVICE_URL` | OCR microservice base URL (doc-request-processing) |
| `PDF_SERVICE_URL` | HTML→PDF microservice (bericht-extern) |
| `DOCUSIGN_ACCOUNT_ID` | DocuSign account (onboarding-signature) |
| `TWILIO_SID` / `TWILIO_FROM` | Twilio creds for SMS escalations |
| `WF_<SLUG>_ID` | n8n workflow ID for each sub-workflow (e.g. `WF_ONBOARDING_SIGNATURE_ID`). Filled in once after import. |

In addition, set up these n8n credentials (referenced by the typed nodes):

- **Microsoft Outlook OAuth2 API** — for every `microsoftOutlook` node.
- **IMAP** — for `review-intake` and `triage-main`.
- **OpenAI API** — for every `@n8n/n8n-nodes-langchain.openAi` node.
- **HTTP Header Auth** *(optional)* — credentials for OCR / PDF / DocuSign / Twilio.

## Importing into n8n

```bash
# CLI import (recommended for CI/seed scripts):
n8n import:workflow --separate --input=legal-automation/workflows
```

Or via UI: open n8n, **Workflows → Import from file** and select each `.json`.

After import, open each parent workflow once and:

1. Pick the right credential for `microsoftOutlook`, `emailReadImap`,
   `openAi` nodes.
2. Set the `WF_<SLUG>_ID` env vars to the IDs n8n assigned to each
   sub-workflow (`Execute Workflow` nodes resolve their target via these).
3. Activate the workflow.

## Verifying

```bash
# A simple JSON sanity-check (run from repo root):
node -e "
const fs = require('fs'), path = require('path');
const root = 'legal-automation/workflows';
let n = 0;
for (const dir of fs.readdirSync(root)) {
  const full = path.join(root, dir);
  if (!fs.statSync(full).isDirectory()) continue;
  for (const f of fs.readdirSync(full)) {
    if (!f.endsWith('.json')) continue;
    const wf = JSON.parse(fs.readFileSync(path.join(full, f), 'utf8'));
    if (!wf.name || !Array.isArray(wf.nodes) || typeof wf.connections !== 'object')
      throw new Error('Invalid workflow: ' + f);
    n++;
  }
}
console.log(n + ' workflows verified.');
"
```

## Workflow → Flowstack3 mapping

The slugs in this folder match the seeds in
`frontend/src/server/services/workflow-service/index.ts` and are surfaced in the
dashboard at `/workflows`. When the backend gains a workflow-import endpoint
these JSON files become the canonical source of truth – the in-memory seed
list will be replaced by a Prisma-backed import of this directory.
