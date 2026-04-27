# Supabase Setup for Prodicta

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in.
2. Click **New Project**, choose your organisation, give the project a name (e.g. `prodicta`), set a strong database password, and select a region close to your users.
3. Wait for the project to finish provisioning (usually under a minute).

---

## 2. Run the SQL Schema

1. In your Supabase project dashboard, open the **SQL Editor** from the left sidebar.
2. Click **New query**.
3. Open `supabase-schema.sql` from this repo and copy the entire contents.
4. Paste it into the SQL Editor and click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`).
5. You should see a success message. All six tables, RLS policies, and indexes will now be created.

> If you need to re-run the schema from scratch (e.g. during development), drop the tables first or use the Supabase dashboard **Table Editor** to delete them before re-running.

---

## 3. Get Your API Keys

In your Supabase project dashboard go to **Project Settings > API**. You will need:

| Key | Where to find it |
|-----|-----------------|
| Project URL | "Project URL" field |
| Anon / Public key | Under "Project API keys", `anon` `public` |
| Service Role key | Under "Project API keys", `service_role` (keep this secret) |

---

## 4. Set Up Environment Variables

Create a `.env.local` file in the root of the project (it is already listed in `.gitignore`, do not commit it):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key

# Used server-side only (API routes / Edge Functions)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Replace the placeholder values with the keys from Step 3.

> `NEXT_PUBLIC_` variables are exposed to the browser. Never put the service role key in a `NEXT_PUBLIC_` variable.

---

## 5. Enable Email Auth (if not already on)

1. Go to **Authentication > Providers** in your Supabase dashboard.
2. Make sure **Email** is enabled.
3. Under **Authentication > URL Configuration**, add your site URL and any redirect URLs you need (e.g. `http://localhost:3000`, `https://yourdomain.com`).

---

## 6. Schema Overview

| Table | Purpose |
|-------|---------|
| `users` | Mirrors Supabase Auth users; stores company name |
| `assessments` | Role assessments created by employers, including AI-generated scenarios and skill weights |
| `candidates` | Individual candidates invited to an assessment via a unique link |
| `responses` | Candidate text responses to each scenario (up to 4 per candidate) |
| `results` | AI-generated scores, narratives, risk level, and onboarding/interview recommendations |
| `benchmarks` | Per-employer skill score thresholds for pass/fail decisions |

All tables have Row Level Security enabled. Employers can only access their own data. Candidates can submit responses and view their own record anonymously via their unique link.

---

## 7. Audit-trail provenance migration

Every report needs to defensibly show which scenario template, scoring rubric, and Claude model generated it. Three columns capture this. Run once against any environment that pre-dates this change (newer environments are unaffected because the columns use IF NOT EXISTS).

```sql
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS scenario_version TEXT;
ALTER TABLE results ADD COLUMN IF NOT EXISTS scoring_rubric_version TEXT;
ALTER TABLE results ADD COLUMN IF NOT EXISTS model_version TEXT;
```

The scoring pipeline reads the canonical values from `lib/constants.js` (`PD_SCENARIO_VERSION`, `PD_RUBRIC_VERSION`, `PD_MODEL_DEFAULT`) and writes them through on every new scoring run. If the migration has not been applied the insert retries without those columns so scoring stays resilient.

---

## 8. Modular Workspace launch and rollback

The modular Workspace is enabled by default for any new assessment
that classifies into a shipped shell (office or healthcare) AND is
created in Strategy-Fit mode OR with the Immersive add-on attached.
Two flags control this, one per shell, and they work independently:

- `assessments.use_modular_workspace` — Phase 1, Office shell.
- `assessments.healthcare_workspace_enabled` — Phase 2, Healthcare/Care shell.

Both flags default to `false` on new rows. Existing rows are never
migrated; they keep whatever value they were created with so
in-flight candidates do not see a behaviour change mid-run.

The assess-side gate at `app/assess/[uniqueToken]/page.js` routes on
the combination of `shell_family`, `workspace_scenario`, and the
matching gate flag:

```
shell_family === 'office'      AND use_modular_workspace      AND workspace_scenario  -> modular Office Workspace
shell_family === 'healthcare'  AND healthcare_workspace_enabled AND workspace_scenario -> modular Healthcare Workspace
otherwise                                                                              -> legacy WorkspacePage
```

A given row carries one gate true, never both, because shell_family
is a single value. Education, field_ops, and out_of_scope shells
continue to fall through to the legacy WorkspacePage; those shells
ship in Phase 3.

### Launch monitoring

Adoption can be monitored by grepping `[generate] assessment_created`
in the platform logs. Each line is structured JSON and carries:

```
{
  assessment_id, mode, shell_family,
  use_modular_workspace,            // office gate
  healthcare_workspace_enabled,     // healthcare gate
  immersive_enabled,
  canonical_match,                  // canonical_label or canonical_id
  block_count,                      // number of blocks selected
  employment_type
}
```

Sample healthcare line for a fresh Registered Nurse assessment:

```
[generate] assessment_created {"assessment_id":"...","mode":"advanced","shell_family":"healthcare","use_modular_workspace":false,"healthcare_workspace_enabled":true,"immersive_enabled":false,"canonical_match":"Registered Nurse (general / specialist)","block_count":4,"employment_type":"permanent"}
```

### Rollback panic buttons

If anything goes wrong post-launch and one of the modular Workspaces
needs to be turned off globally, run the matching SQL against the
production database. Replace `<launch_cutoff>` with the ISO timestamp
of the launch (a safe default is the time the launch commit was
deployed). Anything created before that timestamp is left untouched.

Office shell rollback:

```sql
-- Disable modular Office Workspace for every assessment created since launch.
-- In-flight candidates revert to the legacy WorkspacePage on next load.
UPDATE assessments
   SET use_modular_workspace = false
 WHERE created_at > '<launch_cutoff>'::timestamptz
   AND shell_family = 'office';
```

Healthcare shell rollback:

```sql
-- Disable modular Healthcare Workspace for every assessment created since launch.
-- In-flight candidates revert to the legacy WorkspacePage on next load.
UPDATE assessments
   SET healthcare_workspace_enabled = false
 WHERE created_at > '<launch_cutoff>'::timestamptz
   AND shell_family = 'healthcare';
```

Re-enable after the underlying issue is fixed:

```sql
-- Office.
UPDATE assessments
   SET use_modular_workspace = true
 WHERE created_at > '<launch_cutoff>'::timestamptz
   AND shell_family = 'office'
   AND workspace_scenario IS NOT NULL;

-- Healthcare.
UPDATE assessments
   SET healthcare_workspace_enabled = true
 WHERE created_at > '<launch_cutoff>'::timestamptz
   AND shell_family = 'healthcare'
   AND workspace_scenario IS NOT NULL;
```

---

## 9. Pricing structure (final)

Four assessment types, four price points, two add-ons (Workspace and
Highlight Reel), two billing paths (PAYG one-time vs subscription
invoice line items).

### Assessment types

| Mode (DB) | Public name      | Headline price | Workspace simulation                  | Highlight Reel                         |
| --------- | ---------------- | -------------- | ------------------------------------- | -------------------------------------- |
| `rapid`   | Rapid Screen     | £6 PAYG        | Not offered to PAYG; included for subscribers via add-on flow | Free for subscribers; not offered for PAYG |
| `quick`   | Speed-Fit        | £18 PAYG       | Optional, £25 add-on (Immersive credit for PAYG; invoice line for subscribers) | Optional £10 PAYG add-on; free for subscribers |
| `standard`| Depth-Fit        | £35 PAYG       | Optional, £25 add-on                   | Optional £10 PAYG add-on; free for subscribers |
| `advanced`| Strategy-Fit     | £65 PAYG       | Always included, no extra charge       | Always included, no extra charge       |

### Pay-as-you-go (`plan_type = 'payg'`)

- Workspace simulation: £25 Immersive credit purchased via
  `app/api/stripe/credit-bundle/route.js` with `credit_type: 'immersive'`.
  Sets `assessments.workspace_addon_purchased = true` and flips the
  modular Workspace gate at create time.
- Highlight Reel: separately at £10 (Speed-Fit and Depth-Fit only) via
  the same credit-bundle endpoint with `credit_type: 'highlight-reel'`.
  Sets `assessments.highlight_reel_addon_purchased = true`. Strategy-Fit
  £65 always bundles Highlight Reel, no toggle shown. Rapid Screen PAYG
  does not offer the £10 Highlight Reel.

### Subscription tiers

| Tier         | Monthly | Assessments | Users | Strategy-Fit cap | Workspace on Speed-Fit/Depth-Fit | Highlight Reel        |
| ------------ | ------- | ----------- | ----- | ---------------- | -------------------------------- | --------------------- |
| Starter      | £99     | 10          | 2     | none beyond 10   | £25 invoice line item            | Free on every assessment |
| Professional | £299    | 30          | 5     | none beyond 30   | £25 invoice line item            | Free on every assessment |
| Business     | £499    | 100         | 15    | hard cap at 30   | £25 invoice line item            | Free on every assessment |

The Business tier 30/month Strategy-Fit cap is enforced at assessment
creation time in `app/api/assessment/generate/route.js`. Beyond the
cap the API returns a 400 with `error: 'strategy_fit_cap_reached'` and
a helpful message; the candidate row is never inserted. The
new-assessment page surfaces a courtesy banner when the user is
approaching or at the cap so they don't hit the API error blind.

Strategy-Fit assessments on any tier always bundle Workspace and
Highlight Reel inside the plan slot (one assessment slot consumed,
no extra charge).

The subscriber Workspace add-on is billed via
`stripe.invoiceItems.create` with the `subscription` parameter. The
Highlight Reel inclusion is implicit in the subscription cost (no
per-assessment Stripe call); it surfaces at scoring time when
`results.highlight_reel_token` is minted.

The subscriber add-on is billed via `stripe.invoiceItems.create` with
the `subscription` parameter set so the £25 lands on the customer's
next subscription invoice as a separate line item ("Workspace
simulation: <candidate name>, <role title>"). The subscription
monthly fee plus any add-on items settle in one statement. The
implementation lives in `lib/workspace-addon-billing.js`.

### How the gate decides

`app/api/assessment/generate/route.js` flips the modular Workspace
gate (`use_modular_workspace` for office shell,
`healthcare_workspace_enabled` for healthcare shell) when ANY of:

- `mode === 'advanced'` (Strategy-Fit always includes Workspace)
- `immersive_enabled === true` (PAYG bought Immersive credit)
- `workspace_addon_purchased === true` (subscriber toggled the new
  add-on AND the £25 successfully posted to Stripe as an invoice item)

Education and field_ops shells stay on the legacy WorkspacePage
regardless of these flags until their respective Phase 2.6 / Phase 3
launches.

### Audit-trail columns added

- `assessments.workspace_addon_purchased` (bool, default false) -
  true when Workspace was attached, either as a paid add-on for a
  subscriber on Speed-Fit/Depth-Fit, or implicitly for any
  Strategy-Fit (where it is always included).
- `assessments.workspace_addon_charged_pence` (int, default 0) - the
  amount actually charged. 2500 for a billed subscriber add-on, 0 for
  an included Strategy-Fit.

The launch log line now carries these signals:

```
[generate] assessment_created {
  assessment_id, mode, shell_family,
  use_modular_workspace, healthcare_workspace_enabled,
  immersive_enabled,                 // PAYG path
  workspace_addon_requested,         // subscriber requested the toggle
  workspace_addon_billed,            // Stripe invoice item created OK
  workspace_addon_charged_pence,
  workspace_addon_invoice_item_id,
  ...
}
```

Grepping `workspace_addon_billed:true` shows successful subscriber
charges; `workspace_addon_requested:true workspace_addon_billed:false`
flags subscribers who toggled the add-on but Stripe billing failed
(missing customer/subscription id, Stripe API error, etc.) - those
assessments fall back to the legacy WorkspacePage.

---

## 10. Strategy-Fit components and roadmap

The Strategy-Fit assessment carries layered components above the
Workspace simulation. As of the current launch:

| Component                     | Status         | Where it lives                               |
| ----------------------------- | -------------- | -------------------------------------------- |
| Strategic Thinking Evaluation | Built          | `lib/strategy-fit-components/strategic-thinking.js` (generation), candidate-flow screen between scenarios and Workspace |
| Executive / Development Summary | Built        | `lib/strategy-fit-components/executive-summary.js` (synthesis at scoring time), parchment panel on page 1 of Manager Brief and Evidence Pack PDFs |
| Stakeholder Management Brief  | Roadmap        | Not yet built. Removed from upgrade modal, billing/credits page, new-assessment Strategy-Fit description, and LandingPage pricing card so the marketing copy matches what is actually delivered. |

The two columns added to support the launch:

```sql
alter table public.assessments
  add column if not exists strategy_fit_components jsonb default null;
alter table public.results
  add column if not exists executive_summary jsonb default null;
```

`assessments.strategy_fit_components` keys what is generated at
creation time (`strategic_thinking` today; future Stakeholder
Management Brief would land under `stakeholder_management_brief`
without a schema change). `results.executive_summary` holds the
synthesised top-of-report panel.

Senior-tier candidates (canonical role-mapping level 3 or 4, or
seniority_band manager+) see the **Executive Summary** label.
Junior-mid candidates (level 1-2 or seniority_band junior/mid) see
the **Development Summary** label. The underlying JSONB shape is
identical so the PDF render path is uniform.

Strategy-Fit components do not auto-generate for legacy assessments
created before this launch; both the candidate flow screen and the
PDF summary panel skip cleanly when the columns are null.

---

## 10b. Depth-Fit shell-aware components

`assessments.depth_fit_components` (JSONB) holds the shell+seniority-aware
**Day One Planning** calendar and **Inbox Overload** events the candidate
sees. Shape:

```
{
  "version": "depth-fit-components-v1.0",
  "generated_at": "ISO timestamp",
  "shell_family": "office | healthcare | education",
  "seniority":    "junior | mid | manager | senior",
  "day_one_planning": { fixed_events, interruption, deadline, unscheduled_tasks },
  "inbox_overload":   { scenarios: [...] },
  "diagnostics":      { day_one_planning: {...}, inbox_overload: {...} }
}
```

The generator lives at `lib/depth-fit-components/`:
- `_shared.js` resolves four-tier seniority (junior / mid / manager /
  senior) and ships per-shell guidance lines that the prompts splice in.
  Office shell folds manager into senior to match the platform's
  shipped office content.
- `day-one-planning.js` and `inbox-overload.js` build the prompts and
  call Haiku.
- `index.js` exports `generateDepthFitComponents` (orchestrator),
  `readDayOnePlanning`, and `readInboxOverload` (read-side fallback to
  legacy `assessments.calendar_events` / `assessments.inbox_events`
  for in-flight assessments produced before this column existed).

Reader fallback runs at the API boundary (`/api/assess/[token]/route.js`),
so the candidate flow is unchanged — it still consumes
`assessment.calendar_events` and `assessment.inbox_events` keys; those
keys are now sourced from `depth_fit_components` when present.

The Monday Morning Reality narrative still scores inline in
`lib/score-candidate.js` and is intentionally untouched. Because it
reads the candidate's behaviour against the calendar and inbox, which
are now shell-aware, its output adapts naturally without its own
generator.

Test harness: `/admin/workspace-test` ships a "Generate Depth-Fit
components" button that calls `/api/admin/depth-fit-test` to preview
the calendar + inbox per role + shell without touching the database.

---

## 11. Auth email templates (paste from `supabase/templates/`)

The Supabase Auth confirmation, password-reset, magic-link, email-change
and invite emails are configured in the Supabase Dashboard, not in
code. The repo carries the source-of-truth HTML in
`supabase/templates/`. The previous live confirmation template relied
on CSS inheritance for body-text colour, which Gmail and Outlook web
strip, leaving the body paragraphs unreadable as black-on-navy. Each
template now carries an inline `color` attribute on every text element
so the design survives the strip.

To apply a change:

1. Edit the file in `supabase/templates/`.
2. Open the Supabase Dashboard, **Authentication, Email Templates**.
3. Pick the corresponding template:
   - `confirmation.html` → **Confirm signup**
   - `recovery.html` → **Reset password**
   - `magic_link.html` → **Magic link**
   - `email_change.html` → **Change email address**
   - `invite.html` → **Invite user**
4. Replace the existing template body with the file contents.
5. Save.
6. Trigger a test send (via the Dashboard test button or a real signup
   from a test inbox) to confirm the rendering in Gmail (light + dark
   mode) and Outlook web.

There is no Supabase CLI `config.toml` in this repo, so the templates
do not auto-sync. Repository edits are inert until pasted into the
Dashboard.
