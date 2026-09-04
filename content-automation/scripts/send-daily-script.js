// Sends today's hooks from data/hooks.json to RECIPIENT_EMAIL every morning.
// Topic rotation is deterministic (day count mod bank size). Send timing
// is NOT purely time-based, though: GitHub's scheduled triggers on this
// repo have been observed firing 3.5-4.5 hours late, so an exact-hour
// check silently no-ops every run. Instead this accepts a wide catch-up
// window and uses a committed state file to guarantee at most one send
// per Pacific calendar day, however late in the window the run lands.
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
const WINDOW_START_HOUR = 7; // 7am
const WINDOW_END_HOUR = 13; // through 1pm, inclusive — generous catch-up margin
const STATE_FILE = path.join(__dirname, "..", "state", "last-morning-send.txt");
const SCRIPTS_PER_EMAIL = 5;

function buildFullScriptBlock(topic, index, total) {
  const scriptParagraph = topic.script
    .split("\n")
    .map((line) => `<p style="margin:0 0 12px;">${line}</p>`)
    .join("");

  const sourcesList = (topic.sources || [])
    .map((s) =>
      s.url
        ? `<li style="margin:0 0 4px;">(<a href="${s.url}" style="color:#1a5fb4;">${s.label}</a>)</li>`
        : `<li style="margin:0 0 4px;">(${s.label})</li>`
    )
    .join("");

  return `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;padding:24px 0;${index > 0 ? "border-top:2px solid #e5e5e5;" : ""}">
      <p style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#8a8a8a;margin:0 0 4px;">
        Script ${index + 1} of ${total} &middot; ${topic.category} &middot; ${topic.pillar}
      </p>
      <h2 style="margin:0 0 16px;font-size:22px;">${topic.title}</h2>

      <p style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#8a8a8a;margin:0 0 4px;">Hook (on-screen text / first line)</p>
      <p style="font-size:17px;font-weight:600;margin:0 0 20px;">${topic.hook}</p>

      <p style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#8a8a8a;margin:0 0 4px;">Script (read aloud, ~1-1.5 min at a natural pace — the last line is the button, no separate CTA needed)</p>
      ${scriptParagraph}

      <p style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#8a8a8a;margin:20px 0 4px;">Sources (verify before filming)</p>
      <ul style="margin:0;padding-left:18px;font-size:13px;color:#4a4a4a;">${sourcesList}</ul>
    </div>
  `;
}

function buildHookIdeaBlock(entry, index, total) {
  const scriptParagraph = (entry.script || "")
    .split("\n")
    .map((line) => `<p style="margin:0 0 12px;">${line}</p>`)
    .join("");

  const sourcesList = (entry.sources || [])
    .map((s) =>
      s.url
        ? `<li style="margin:0 0 4px;">(<a href="${s.url}" style="color:#1a5fb4;">${s.label}</a>)</li>`
        : `<li style="margin:0 0 4px;">(${s.label})</li>`
    )
    .join("");

  return `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;padding:24px 0;${index > 0 ? "border-top:2px solid #e5e5e5;" : ""}">
      <p style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#8a8a8a;margin:0 0 4px;">
        Idea ${index + 1} of ${total} &middot; ${entry.category} &middot; ${entry.format}
      </p>
      <p style="font-size:19px;font-weight:600;margin:0 0 16px;">"${entry.hook}"</p>

      ${entry.script ? `
      <p style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#8a8a8a;margin:0 0 4px;">Draft script</p>
      ${scriptParagraph}
      ` : `
      <p style="font-size:13px;color:#8a8a8a;margin:0 0 16px;">No draft script yet for this one — bring your own take.</p>
      `}

      ${entry.note ? `
      <p style="font-size:13px;background:#fff3cd;color:#664d03;padding:10px 12px;border-radius:6px;margin:0 0 16px;">
        ⚠️ ${entry.note}
      </p>
      ` : ""}

      ${sourcesList ? `
      <p style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#8a8a8a;margin:0 0 4px;">Sources (verify before filming)</p>
      <ul style="margin:0 0 8px;padding-left:18px;font-size:13px;color:#4a4a4a;">${sourcesList}</ul>
      ` : ""}

      ${entry.caption ? `
      <p style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#8a8a8a;margin:20px 0 4px;">Caption (TikTok / Instagram)</p>
      <p style="margin:0 0 4px;">${entry.caption}</p>
      <p style="margin:0 0 16px;color:#1a5fb4;">${(entry.hashtags || []).join(" ")}</p>
      ` : ""}

      <p style="font-size:12px;color:#8a8a8a;margin:0;">
        Bracketed parts in the script are yours to fill in, and check whether any referenced
        trend/audio is still current before filming.
      </p>
    </div>
  `;
}

function buildEmailHtml(items) {
  const isHookBank = items.length > 0 && !!items[0].format;
  const blocks = items
    .map((item, index) =>
      isHookBank
        ? buildHookIdeaBlock(item, index, items.length)
        : buildFullScriptBlock(item, index, items.length)
    )
    .join("");

  return `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
      ${blocks}
      <p style="font-size:12px;color:#8a8a8a;margin:24px 0 0;">
        ${
          isHookBank
            ? "Pulled from content-automation/data/hooks.json (Banke's Hook Bank). Edit that file to add, remove, or rewrite hooks; the rotation updates automatically."
            : "Every fact here comes with a named source so you can double-check before filming — treat this as a well-researched first draft, not a final script. Edit content-automation/data/topics.json in the repo to add, remove, or rewrite topics; the rotation updates automatically."
        }
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

  // Sourcing exclusively from the Hook Bank per the creator's request — the
  // full-script topics.json bank is left in place but unused for now. Swap
  // loadHooks() for a topics.json loader to resume sending full researched scripts.
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

  const isHookBank = !!todays[0].format;
  const subjectLabel = isHookBank ? "hook ideas" : "scripts";
  const subjectPreview = isHookBank
    ? todays[0].hook.slice(0, 50)
    : todays[0].title.split(" — ")[0];

  await transporter.sendMail({
    from: `"Daily Content Scripts" <${gmailUser}>`,
    to: recipient,
    subject: `🎬 Today's ${todays.length} ${subjectLabel} — ${subjectPreview}${subjectPreview.length >= 50 ? "…" : ""} + ${todays.length - 1} more`,
    html: buildEmailHtml(todays),
  });

  console.log(
    `Sent ${todays.length} topics (${todays.map((t) => t.id).join(", ")}) to ${recipient}.`
  );

  if (!forceSend) {
    writeLastSentDate(STATE_FILE, todayStr);
    console.log(`Recorded ${todayStr} to ${STATE_FILE}.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
