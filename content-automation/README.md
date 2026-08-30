# Daily Content Script Automation

Every morning at 8am Pacific, a GitHub Action emails **5 ready-to-film**
TikTok/Instagram scripts (hook + ~1.5-2 minute script + sign-off + linked
sources) to `bankebalogun@gmail.com`. Every single day's batch is
guaranteed to include all four categories — **ballet**, **opera**,
**classical music**, and **classical/orchestral music hiding in video games**
(90s-2000s era) — never five from the same bucket. See `STRATEGY.md` for the
content strategy behind this — pillars, gaps to fill, and growth ideas.

**Content rules baked into every script:** no death, no violent or
controversial subject matter, real sources with direct links wherever one
exists, and a personal, first-person, anecdote-driven voice rather than a
"did you know" clickbait format — modeled directly on scripts you've
actually written and posted.

## How it works

- `data/topics.json` — the bank of scripts. Each entry has `category` (one of
  `ballet`, `opera`, `classical-music`, `video-games`), `pillar` (sub-theme),
  `title` (format: `TOPIC — punchy subtitle`, all caps, matching your video
  title-card style), `hook` (opening line, doubles as on-screen text),
  `script` (the full ~1-1.5 min script — the last line is the punchline/button,
  there's no separate CTA field anymore), and `sources` (an array of
  `{ label, url }`, `url` is `null` only for a couple of general-knowledge
  claims with no single canonical source).
- `scripts/send-daily-script.js` — picks today's 5 topics. The selection
  always takes one topic from *each* category first (rotating deterministically
  by day count through that category's own list, so it works through the
  whole category before repeating), then fills any remaining slot from a
  category that itself rotates day to day — guaranteeing every email mixes
  categories, never five from one bucket. Emails them as one message via
  Gmail SMTP.
- `.github/workflows/daily-script-email.yml` — runs the script on a schedule.

## A note on sourcing

Every script's `sources` field links directly to a real, checkable
reference — mostly Wikipedia articles backed by primary sources, official
game/soundtrack pages, or news coverage (e.g. GRAMMY.com, NPR, FTC consumer
alerts) — rendered as clickable links in the email itself. The two entries
without a direct link are general-knowledge observations (e.g. "pop stars
borrow ballet visuals") with no single citable source; those are labeled
as such rather than given a fake link. If you ever want a specific script's
facts re-verified against current web sources before filming, ask and I'll
check it.

## A note on voice

These scripts are modeled on transcripts of videos you've actually written
and posted — first-person, anecdote-driven, ending on a genuine
recommendation rather than a generic "follow for more." Where a real
personal anecdote would naturally go (e.g. "I saw this live at..."), the
script is written in general enthusiastic first-person instead, since I
can't invent specific things you did or saw — swap in your own specific
memory or reaction there before filming if you have one.

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
(`id`, `pillar`, `category`, `title`, `hook`, `script`, `platforms`,
`sources`). `category` must be one of `ballet`, `opera`, `classical-music`,
or `video-games`. End the script on its own punchline/button line rather
than a generic CTA. No code changes needed; the rotation picks it up
automatically. Keep `script` to roughly 100-150 words so it reads in under a
minute at a natural pace, and always include at least one real, named
source per script.

**Every script is a first draft.** Treat the email as a script to personalize
in your own voice, verify any date/name you're not 100% sure of, and adapt
before filming — not a final, publish-as-is product.
