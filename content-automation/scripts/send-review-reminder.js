// Sends a 5pm Pacific reminder recapping the hooks emailed that same morning,
// so the creator has a nudge to actually review/film before the day ends.
// Uses the same deterministic selection as send-daily-script.js (same day
// count -> same picks), so this never needs to share state with that run.
const nodemailer = require("nodemailer");
const { currentLocalHour, loadHooks, loadTopics, todaysTopics } = require("./lib/select-daily");

const TIMEZONE = "America/Los_Angeles";
const TARGET_LOCAL_HOUR = 17;
const SCRIPTS_PER_EMAIL = 5;
const BONUS_HOOKS_PER_EMAIL = 2;

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
      <p style="margin:0 0 16px;">Here's what went out at 7am today — have you looked at these yet?</p>
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

  if (!forceSend && localHour !== TARGET_LOCAL_HOUR) {
    console.log(
      `Local hour in ${TIMEZONE} is ${localHour}, not ${TARGET_LOCAL_HOUR}. Skipping (this run covers the other DST offset).`
    );
    return;
  }

  // Mirrors send-daily-script.js's selection exactly (same day count -> same
  // picks) so this recaps exactly what went out that morning: the 5
  // category-guaranteed scripts plus the bonus hook ideas.
  const scripts = loadTopics();
  const scriptItems = todaysTopics(scripts, SCRIPTS_PER_EMAIL);

  const hooks = loadHooks();
  const hookItems = todaysTopics(hooks, BONUS_HOOKS_PER_EMAIL, {
    guaranteeAllCategories: false,
  });

  const todays = [...scriptItems, ...hookItems];

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
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
