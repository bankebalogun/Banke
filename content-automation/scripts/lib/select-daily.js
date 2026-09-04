// Shared selection logic used by both the morning send and the evening
// review reminder, so the reminder always describes exactly what the
// morning email actually contained for that same calendar day.
const fs = require("fs");
const path = require("path");

function currentLocalHour(timeZone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hourCycle: "h23",
  });
  return Number(formatter.format(new Date()));
}

// GitHub Actions scheduled triggers are best-effort and have been observed
// firing 3.5-4.5 hours late on this repo (documented GitHub behavior under
// load, not something a workflow can control). A single exact-hour check
// combined with that kind of delay means the run silently no-ops every
// time. currentLocalDateString + the state-file helpers below let a script
// accept a wide catch-up window and still send at most once per day.
function currentLocalDateString(timeZone) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date()); // YYYY-MM-DD
}

function readLastSentDate(stateFilePath) {
  try {
    return fs.readFileSync(stateFilePath, "utf8").trim();
  } catch {
    return null;
  }
}

function writeLastSentDate(stateFilePath, dateStr) {
  fs.mkdirSync(path.dirname(stateFilePath), { recursive: true });
  fs.writeFileSync(stateFilePath, dateStr + "\n");
}

function loadHooks() {
  const hooksPath = path.join(__dirname, "..", "..", "data", "hooks.json");
  const hooks = JSON.parse(fs.readFileSync(hooksPath, "utf8"));
  if (!Array.isArray(hooks) || hooks.length === 0) {
    throw new Error(`${hooksPath} is empty or malformed.`);
  }
  return hooks;
}

// Guarantees every day's batch mixes categories: picks one entry from each
// category (deterministically rotating through that category's own list),
// then fills any remaining slots by rotating which category contributes an
// extra pick.
function todaysTopics(topics, count) {
  const daysSinceEpoch = Math.floor(Date.now() / 86400000);

  const byCategory = {};
  topics.forEach((t) => {
    byCategory[t.category] = byCategory[t.category] || [];
    byCategory[t.category].push(t);
  });
  const categories = Object.keys(byCategory).sort();

  const picks = [];
  const pickFromCategory = (cat, offset) => {
    const list = byCategory[cat];
    return list[(daysSinceEpoch + offset) % list.length];
  };

  categories.forEach((cat) => picks.push(pickFromCategory(cat, 0)));

  let extraIndex = 0;
  while (picks.length < count) {
    const cat = categories[daysSinceEpoch % categories.length];
    const candidate = pickFromCategory(cat, extraIndex + 1);
    if (!picks.includes(candidate)) picks.push(candidate);
    extraIndex++;
    if (extraIndex > topics.length) break; // safety valve if count > topics.length
  }

  return picks.slice(0, count);
}

module.exports = {
  currentLocalHour,
  currentLocalDateString,
  readLastSentDate,
  writeLastSentDate,
  loadHooks,
  todaysTopics,
};
