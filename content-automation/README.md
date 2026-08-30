# Daily Content Script Automation

Every morning at 8am Pacific, a GitHub Action emails one ready-to-film
TikTok/Instagram script (hook + ~50-60 second script + CTA) to
`bankebalogun@gmail.com`. See `STRATEGY.md` for the content strategy behind
this — pillars, gaps to fill, and growth ideas.

## How it works

- `data/topics.json` — the bank of scripts. Each entry has `pillar`, `title`,
  `hook`, `script`, and `cta`.
- `scripts/send-daily-script.js` — picks today's topic (deterministic
  rotation: `days since epoch mod bank size`, so it cycles through the whole
  bank before repeating, no database needed) and emails it via Gmail SMTP.
- `.github/workflows/daily-script-email.yml` — runs the script on a schedule.

### Why two cron times?

GitHub Actions cron only runs in UTC and doesn't know about daylight saving.
8am Pacific is 15:00 UTC in summer (PDT) and 16:00 UTC in winter (PST), so the
workflow is scheduled at both times every day. The script checks the *actual*
current Pacific hour and only sends when it's really 8am there — the other
run silently exits. You'll get exactly one email a day, no duplicates.

## One-time setup (do this in the GitHub repo settings, not here)

1. **Create a Gmail App Password** (requires 2-Step Verification enabled on
   the Google account):
   - Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
   - Create a new app password (name it e.g. "content-automation")
   - Copy the 16-character password
2. **Add repo secrets**: repo → Settings → Secrets and variables → Actions →
   New repository secret:
   - `GMAIL_USER` — the Gmail address sending the email (e.g.
     `bankebalogun@gmail.com`)
   - `GMAIL_APP_PASSWORD` — the app password from step 1
   - `RECIPIENT_EMAIL` — where the daily script should land (can be the same
     address as `GMAIL_USER`, or a different inbox)
3. That's it. The workflow runs automatically after these secrets exist.

## Testing it

- **Manual trigger with force-send**: repo → Actions → "Daily Content Script
  Email" → Run workflow → set `force` to `true`. This sends immediately
  regardless of the time of day, so you can confirm the secrets work without
  waiting for 8am.
- **Local test** (from `content-automation/`):
  ```
  npm install
  GMAIL_USER=you@gmail.com GMAIL_APP_PASSWORD=xxxx RECIPIENT_EMAIL=you@gmail.com FORCE_SEND=true npm run send
  ```

## Adding or editing scripts

Just edit `data/topics.json` — append a new object with the same shape
(`id`, `pillar`, `title`, `hook`, `script`, `cta`, `platforms`). No code
changes needed; the rotation picks it up automatically. Keep `script` to
roughly 100-150 words so it reads in under a minute at a natural pace.

**Every script is a first draft.** Treat the email as a script to personalize
in your own voice, verify any date/name you're not 100% sure of, and adapt
before filming — not a final, publish-as-is product.
