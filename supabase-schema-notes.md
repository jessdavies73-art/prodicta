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

Phase 1 of the modular Workspace is enabled by default for any new
assessment that classifies into the office shell AND is created in
Strategy-Fit mode OR with the Immersive add-on attached. The flag
that controls this is `assessments.use_modular_workspace`. Existing
rows are not migrated; they keep whatever value they were created
with so in-flight candidates do not see a behaviour change mid-run.

If anything goes wrong post-launch and the modular Workspace needs
to be turned off globally, run this single panic-button command
against the production database. Replace `<launch_cutoff>` with the
ISO timestamp of the launch (a safe default is the time the launch
commit was deployed). Anything created before that timestamp is
left untouched.

```sql
-- Disable modular Workspace for every assessment created since launch.
-- In-flight candidates revert to the legacy WorkspacePage on next load.
UPDATE assessments
   SET use_modular_workspace = false
 WHERE created_at > '<launch_cutoff>'::timestamptz;
```

To re-enable later (after the underlying issue is fixed):

```sql
UPDATE assessments
   SET use_modular_workspace = true
 WHERE created_at > '<launch_cutoff>'::timestamptz
   AND shell_family = 'office'
   AND workspace_scenario IS NOT NULL;
```

Adoption can be monitored by grepping `[generate] assessment_created`
in the platform logs; each line carries `use_modular_workspace`,
`shell_family`, `block_count`, and the canonical role match.

---

## 9. Auth email templates (paste from `supabase/templates/`)

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
