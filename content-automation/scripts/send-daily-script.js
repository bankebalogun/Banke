// Sends one script from data/topics.json to RECIPIENT_EMAIL every morning.
// Rotation is deterministic (day count mod bank size), so no state file is
// needed between runs and the full bank cycles before repeating.
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

const TIMEZONE = "America/Los_Angeles";
const TARGET_LOCAL_HOUR = 8;
const SCRIPTS_PER_EMAIL = 5;

function currentLocalHour(timeZone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hourCycle: "h23",
  });
  return Number(formatter.format(new Date()));
}

function todaysTopics(topics, count) {
  const cycleLength = Math.ceil(topics.length / count);
  const daysSinceEpoch = Math.floor(Date.now() / 86400000);
  const cycleDay = daysSinceEpoch % cycleLength;
  const start = cycleDay * count;
  const picks = [];
  for (let i = 0; i < count; i++) {
    picks.push(topics[(start + i) % topics.length]);
  }
  return picks;
}

function buildScriptBlock(topic, index, total) {
  const scriptParagraph = topic.script
    .split("\n")
    .map((line) => `<p style="margin:0 0 12px;">${line}</p>`)
    .join("");

  const sourcesList = (topic.sources || [])
    .map((s) => `<li style="margin:0 0 4px;">${s}</li>`)
    .join("");

  return `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;padding:24px 0;${index > 0 ? "border-top:2px solid #e5e5e5;" : ""}">
      <p style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#8a8a8a;margin:0 0 4px;">
        Script ${index + 1} of ${total} &middot; ${topic.category} &middot; ${topic.pillar}
      </p>
      <h2 style="margin:0 0 16px;font-size:22px;">${topic.title}</h2>

      <p style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#8a8a8a;margin:0 0 4px;">Hook (on-screen text / first line)</p>
      <p style="font-size:17px;font-weight:600;margin:0 0 20px;">${topic.hook}</p>

      <p style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#8a8a8a;margin:0 0 4px;">Script (read aloud, ~50-60 sec)</p>
      ${scriptParagraph}

      <p style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#8a8a8a;margin:20px 0 4px;">Call to action</p>
      <p style="margin:0 0 20px;">${topic.cta}</p>

      <p style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#8a8a8a;margin:20px 0 4px;">Sources (verify before filming)</p>
      <ul style="margin:0;padding-left:18px;font-size:13px;color:#4a4a4a;">${sourcesList}</ul>
    </div>
  `;
}

function buildEmailHtml(topics) {
  const blocks = topics
    .map((topic, index) => buildScriptBlock(topic, index, topics.length))
    .join("");

  return `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
      ${blocks}
      <p style="font-size:12px;color:#8a8a8a;margin:24px 0 0;">
        Every fact here comes with a named source so you can double-check before filming —
        treat this as a well-researched first draft, not a final script. Edit
        content-automation/data/topics.json in the repo to add, remove, or rewrite topics;
        the rotation updates automatically.
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

  const topicsPath = path.join(__dirname, "..", "data", "topics.json");
  const topics = JSON.parse(fs.readFileSync(topicsPath, "utf8"));

  if (!Array.isArray(topics) || topics.length === 0) {
    throw new Error("topics.json is empty or malformed.");
  }

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
    subject: `🎬 Today's ${todays.length} scripts: ${todays.map((t) => t.title).join(", ")}`,
    html: buildEmailHtml(todays),
  });

  console.log(
    `Sent ${todays.length} topics (${todays.map((t) => t.id).join(", ")}) to ${recipient}.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
