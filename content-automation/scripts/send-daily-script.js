// Sends today's hooks from data/hooks.json to RECIPIENT_EMAIL every morning.
// Rotation is deterministic (day count mod bank size), so no state file is
// needed between runs and the full bank cycles before repeating.
const nodemailer = require("nodemailer");
const { currentLocalHour, loadHooks, loadTopics, todaysTopics } = require("./lib/select-daily");

const TIMEZONE = "America/Los_Angeles";
const TARGET_LOCAL_HOUR = 7;
const SCRIPTS_PER_EMAIL = 5;
const BONUS_HOOKS_PER_EMAIL = 2;

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

      <p style="font-size:12px;color:#8a8a8a;margin:0;">
        Bracketed parts in the script are yours to fill in, and check whether any referenced
        trend/audio is still current before filming.
      </p>
    </div>
  `;
}

function buildEmailHtml(scriptItems, hookItems) {
  const scriptBlocks = scriptItems
    .map((item, index) => buildFullScriptBlock(item, index, scriptItems.length))
    .join("");

  const hookSection = hookItems.length
    ? `
      <div style="margin:8px 0 0;padding:20px 0 0;border-top:4px solid #1a1a1a;">
        <p style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#8a8a8a;margin:0 0 16px;">
          + ${hookItems.length} bonus hook idea${hookItems.length === 1 ? "" : "s"} from the Hook Bank
        </p>
        ${hookItems.map((item, index) => buildHookIdeaBlock(item, index, hookItems.length)).join("")}
      </div>
    `
    : "";

  return `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
      ${scriptBlocks}
      ${hookSection}
      <p style="font-size:12px;color:#8a8a8a;margin:24px 0 0;">
        Every fact in the full scripts comes with a named source so you can double-check before
        filming — treat these as well-researched first drafts, not final scripts. Edit
        content-automation/data/topics.json to add, remove, or rewrite scripts, and
        content-automation/data/hooks.json to add, remove, or rewrite bonus hook ideas; the
        rotation for both updates automatically.
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

  // Combines both banks: the 5 category-guaranteed full scripts from
  // topics.json (ballet/opera/classical-music/video-games/theater, never
  // five from one bucket) plus a couple of bonus hook ideas from hooks.json
  // (the Hook Bank), each rotating deterministically by day count.
  const scripts = loadTopics();
  const scriptItems = todaysTopics(scripts, SCRIPTS_PER_EMAIL);

  const hooks = loadHooks();
  const hookItems = todaysTopics(hooks, BONUS_HOOKS_PER_EMAIL, {
    guaranteeAllCategories: false,
  });

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

  const subjectPreview = scriptItems[0].title.split(" — ")[0];
  const totalCount = scriptItems.length + hookItems.length;

  await transporter.sendMail({
    from: `"Daily Content Scripts" <${gmailUser}>`,
    to: recipient,
    subject: `🎬 Today's ${scriptItems.length} scripts — ${subjectPreview}${subjectPreview.length >= 50 ? "…" : ""} + ${totalCount - 1} more`,
    html: buildEmailHtml(scriptItems, hookItems),
  });

  console.log(
    `Sent ${scriptItems.length} scripts (${scriptItems.map((t) => t.id).join(", ")}) + ${hookItems.length} bonus hooks (${hookItems.map((t) => t.id).join(", ")}) to ${recipient}.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
