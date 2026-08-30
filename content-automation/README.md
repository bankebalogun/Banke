# Daily Content Script Automation

Every morning at 8am Pacific, a GitHub Action emails **5 ready-to-film**
TikTok/Instagram scripts (hook + ~50-60 second script + CTA + sources to
verify) to `bankebalogun@gmail.com`, mixed across four categories: **ballet**,
**opera**, **classical music**, and **classical/orchestral music hiding in
video games** (90s-2000s era). See `STRATEGY.md` for the content strategy
behind this — pillars, gaps to fill, and growth ideas.

## How it works

- `data/topics.json` — the bank of scripts. Each entry has `category` (one of
  `ballet`, `opera`, `classical-music`, `video-games`), `pillar` (sub-theme),
  `title`, `hook`, `script`, `cta`, and `sources` (named references so every
  factual claim can be checked before filming). The file is pre-interleaved
  across categories so a sequential batch of 5 gives a mix, not five of the
  same category in a row.
- `scripts/send-daily-script.js` — picks today's 5 topics (deterministic
  rotation: a day count mod the cycle length, so it works through the whole
  bank before repeating, no database needed) and emails them as one message
  via Gmail SMTP.
- `.github/workflows/daily-script-email.yml` — runs the script on a schedule.

## A note on sourcing

Every script's `sources` field names a real book, primary source, or article
so you (or I, on your ask) can double-check a claim before it goes in a
video. These are **named references, not guaranteed live links** — check the
book/database named rather than assuming a URL. If you ever want a specific
script's facts re-verified against current web sources before filming, ask
and I'll check it.

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
(`id`, `pillar`, `category`, `title`, `hook`, `script`, `cta`, `platforms`,
`sources`). `category` must be one of `ballet`, `opera`, `classical-music`,
or `video-games`. No code changes needed; the rotation picks it up
automatically. Keep `script` to roughly 100-150 words so it reads in under a
minute at a natural pace, and always include at least one real, named
source per script.

**Every script is a first draft.** Treat the email as a script to personalize
in your own voice, verify any date/name you're not 100% sure of, and adapt
before filming — not a final, publish-as-is product.
