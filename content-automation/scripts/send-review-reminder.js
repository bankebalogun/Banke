// Sends a 5pm Pacific reminder recapping the hooks emailed that same morning,
// so the creator has a nudge to actually review/film before the day ends.
// Uses the same deterministic selection as send-daily-script.js (same day
// count -> same picks), so this never needs to share state with that run
// for CONTENT purposes. It does need its own state file for TIMING,
// though: GitHub's scheduled triggers on this repo have been observed
// firing 3.5-4.5 hours late, so an exact-hour check silently no-ops every
// run. This accepts a wide catch-up window and guarantees at most one
// send per Pacific calendar day via a committed state file.
const path = require("path");
const nodemailer = require("nodemailer");
const {
  currentLocalHour,
  currentLocalDateString,
  readLastSentDate,
  writeLastSentDate,
  loadHooks,
  todaysTopics,
} = require("./lib/select-daily");

const TIMEZONE = "America/Los_Angeles";
const WINDOW_START_HOUR = 17; // 5pm
const WINDOW_END_HOUR = 23; // through 11pm, inclusive — generous catch-up margin
const STATE_FILE = path.join(__dirname, "..", "state", "last-reminder-send.txt");
const SCRIPTS_PER_EMAIL = 5;

function buildReminderHtml(todays) {
  const items = todays
    .map(
      (t, i) => `
      <li style="margin:0 0 12px;">
        <strong>${i + 1}.</strong> "${t.hook}"
        <span style="color:#8a8a8a;font-size:12px;"> — ${t.category} &middot; ${t.format || t.pillar}</span>
      </li>
    `
    )
    .join("");

  return `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
      <h2 style="margin:0 0 12px;font-size:20px;">⏰ Reminder: review this morning's hooks</h2>
      <p style="margin:0 0 16px;">Here's what went out this morning — have you looked at these yet?</p>
      <ul style="margin:0 0 20px;padding-left:20px;">${items}</ul>
      <p style="font-size:13px;color:#8a8a8a;margin:0;">
        Full details are in this morning's "Today's scripts/hook ideas" email in this inbox.
      </p>
    </div>
  `;
}

async function main() {
  const forceSend = process.env.FORCE_SEND === "true";
  const localHour = currentLocalHour(TIMEZONE);
  const todayStr = currentLocalDateString(TIMEZONE);

  if (!forceSend) {
    if (localHour < WINDOW_START_HOUR || localHour > WINDOW_END_HOUR) {
      console.log(
        `Local hour in ${TIMEZONE} is ${localHour}, outside the ${WINDOW_START_HOUR}:00-${WINDOW_END_HOUR}:00 catch-up window. Skipping.`
      );
      return;
    }
    const lastSent = readLastSentDate(STATE_FILE);
    if (lastSent === todayStr) {
      console.log(`Already sent today (${todayStr}). Skipping.`);
      return;
    }
  }

  const topics = loadHooks();
  const todays = todaysTopics(topics, SCRIPTS_PER_EMAIL);

  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
  const recipient = process.env.RECIPIENT_EMAIL || gmailUser;

  if (!gmailUser || !gmailAppPassword) {
    throw new Error(
      "Missing GMAIL_USER or GMAIL_APP_PASSWORD environment variables/secrets."
    );
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailAppPassword },
  });

  await transporter.sendMail({
    from: `"Daily Content Scripts" <${gmailUser}>`,
    to: recipient,
    subject: "⏰ Reminder: review today's content hooks",
    html: buildReminderHtml(todays),
  });

  console.log(`Sent 5pm review reminder (${todays.map((t) => t.id).join(", ")}) to ${recipient}.`);

  if (!forceSend) {
    writeLastSentDate(STATE_FILE, todayStr);
    console.log(`Recorded ${todayStr} to ${STATE_FILE}.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
