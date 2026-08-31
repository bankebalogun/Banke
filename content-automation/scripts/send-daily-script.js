// Sends today's hooks from data/hooks.json to RECIPIENT_EMAIL every morning.
// Rotation is deterministic (day count mod bank size), so no state file is
// needed between runs and the full bank cycles before repeating.
const nodemailer = require("nodemailer");
const { currentLocalHour, loadHooks, todaysTopics } = require("./lib/select-daily");

const TIMEZONE = "America/Los_Angeles";
const TARGET_LOCAL_HOUR = 7;
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
  return `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;padding:24px 0;${index > 0 ? "border-top:2px solid #e5e5e5;" : ""}">
      <p style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#8a8a8a;margin:0 0 4px;">
        Idea ${index + 1} of ${total} &middot; ${entry.category} &middot; ${entry.format}
      </p>
      <p style="font-size:19px;font-weight:600;margin:0 0 12px;">"${entry.hook}"</p>
      <p style="font-size:13px;color:#8a8a8a;margin:0;">
        This is a hook/format idea, not a finished script — bring your own take, opinion, or
        experience to it, and check whether the referenced trend/audio is still current before
        filming.
      </p>
    </div>
  `;
}

function buildEmailHtml(items) {
  const blocks = items
    .map((item, index) =>
      item.script
        ? buildFullScriptBlock(item, index, items.length)
        : buildHookIdeaBlock(item, index, items.length)
    )
    .join("");

  const isHookBank = items.length > 0 && !items[0].script;

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

  if (!forceSend && localHour !== TARGET_LOCAL_HOUR) {
    console.log(
      `Local hour in ${TIMEZONE} is ${localHour}, not ${TARGET_LOCAL_HOUR}. Skipping (this run covers the other DST offset).`
    );
    return;
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

  const isHookBank = !todays[0].script;
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
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
