# PRODICTA Supabase Auth email templates

## Why this directory exists

The Supabase Auth confirmation, password-reset, magic-link, email-change
and invite emails are configured in the Supabase Dashboard (not in
code). These five HTML files are the **source of truth** for those
templates. When you change a template in this directory, you must paste
the new contents into the Supabase Dashboard for the change to take
effect.

## Why every text element has an inline `color`

Gmail and Outlook web strip CSS classes and many inherited style rules.
The original confirmation template relied on inheritance, which meant
the body paragraphs appeared in default-black on the dark navy card and
were unreadable. Every `<p>`, `<span>`, `<a>` and `<td>` in these files
now carries an explicit `color` attribute so the design survives the
strip.

## How to apply a template change

1. Edit the relevant `.html` file in this directory.
2. Open the Supabase Dashboard for the production project.
3. Navigate to **Authentication → Email Templates**.
4. Pick the template you edited:
   - `confirmation.html` → **Confirm signup**
   - `recovery.html` → **Reset password**
   - `magic_link.html` → **Magic link**
   - `email_change.html` → **Change email address**
   - `invite.html` → **Invite user**
5. Copy the file contents and paste them into the editor, replacing the
   existing template entirely.
6. Save.
7. Send a test email (use the **Send test email** button in the
   dashboard, or trigger a real signup from a test inbox) to confirm
   the new template renders correctly in Gmail (light + dark mode) and
   Outlook web.

## Template variables

Supabase substitutes these at send time:

| Token                  | Meaning                                          |
|------------------------|--------------------------------------------------|
| `{{ .ConfirmationURL }}` | The single-use action link (confirm / reset etc.) |
| `{{ .Token }}`           | The OTP, when an OTP flow is used               |
| `{{ .TokenHash }}`       | Hashed token for verify endpoints               |
| `{{ .SiteURL }}`         | The site URL configured in Auth, Settings       |
| `{{ .Email }}`           | The user's current email address                |
| `{{ .NewEmail }}`        | The new email (email_change only)               |

Leave these tokens exactly as they appear in the templates; do not
URL-encode them.

## Why product emails (team invite, candidate invite, etc.) are not in this folder

Those emails are sent from API routes via Resend and are already inline-
styled and version-controlled in the repo:

- `app/api/team/invite/route.js`            — team member invite
- `app/api/candidates/invite/route.js`      — candidate assessment invite
- `app/api/send-client-email/route.js`      — Manager Brief / Evidence Pack delivery
- `app/api/cron/follow-up/route.js`         — follow-up nudge
- `app/api/cron/outcome-reminders/route.js` — outcome capture reminder
- plus assorted other transactional sends.

They were audited at the same time as this template fix and use a safe
pattern: navy-only as a thin header strip carrying just the wordmark,
with the body content sitting on a white card with explicit
`color:#0f172a` on every text element. None of them have the dark-on-
dark issue that affected the Supabase Auth confirmation email.
