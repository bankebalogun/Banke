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

function loadHooks() {
  const hooksPath = path.join(__dirname, "..", "..", "data", "hooks.json");
  const hooks = JSON.parse(fs.readFileSync(hooksPath, "utf8"));
  if (!Array.isArray(hooks) || hooks.length === 0) {
    throw new Error(`${hooksPath} is empty or malformed.`);
  }
  return hooks;
}

function loadTopics() {
  const topicsPath = path.join(__dirname, "..", "..", "data", "topics.json");
  const topics = JSON.parse(fs.readFileSync(topicsPath, "utf8"));
  if (!Array.isArray(topics) || topics.length === 0) {
    throw new Error(`${topicsPath} is empty or malformed.`);
  }
  return topics;
}

// Guarantees every day's batch mixes categories: picks one entry from each
// category (deterministically rotating through that category's own list),
// then fills any remaining slots by rotating which category contributes an
// extra pick. Pass { guaranteeAllCategories: false } (e.g. for a smaller
// bonus batch out of a bank with more categories than slots) to instead
// rotate day-to-day through *which* categories get picked at all.
function todaysTopics(topics, count, { guaranteeAllCategories = true } = {}) {
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

  if (guaranteeAllCategories) {
    categories.forEach((cat) => picks.push(pickFromCategory(cat, 0)));
  }

  let extraIndex = 0;
  while (picks.length < count) {
    const cat = categories[(daysSinceEpoch + extraIndex) % categories.length];
    const candidate = pickFromCategory(cat, extraIndex + 1);
    if (!picks.includes(candidate)) picks.push(candidate);
    extraIndex++;
    if (extraIndex > topics.length) break; // safety valve if count > topics.length
  }

  return picks.slice(0, count);
}

module.exports = { currentLocalHour, loadHooks, loadTopics, todaysTopics };
