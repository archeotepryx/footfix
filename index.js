const { Telegraf, Markup } = require("telegraf");
const axios = require("axios");
const dayjs = require("dayjs");
const express = require("express"); // ✅ Added Express

const bot = new Telegraf("8200700934:AAFRPZH5meOTsV66FfmFbU4xZ8004CKtgIA");
const API_KEY = "02fbc46cde747dc35d63d130b61142f8";
const API_URL = "https://v3.football.api-sports.io";

const headers = {
  "x-apisports-key": API_KEY,
};

// 🔧 Helper to split long messages
async function sendChunkedMessage(ctx, fullMessage) {
  const maxLength = 4000;
  if (fullMessage.length <= maxLength) {
    return ctx.reply(fullMessage);
  }

  const chunks = [];
  let remaining = fullMessage;
  while (remaining.length > 0) {
    let chunk = remaining.slice(0, maxLength);
    const lastBreak = chunk.lastIndexOf("\n🏟️");
    if (lastBreak > 0 && remaining.length > maxLength) {
      chunk = chunk.slice(0, lastBreak);
    }
    chunks.push(chunk);
    remaining = remaining.slice(chunk.length);
  }

  for (const part of chunks) {
    await ctx.reply(part);
  }
}

// 🏁 Start
bot.start((ctx) => {
  ctx.reply(
    "⚽ Welcome to Football Fixtures Bot!\n\nChoose an option:",
    Markup.keyboard([
      ["📅 Today", "📆 Tomorrow"],
      ["🔴 Live Matches"],
      ["🌍 Popular Leagues", "👩 Women’s Football"],
    ]).resize(),
  );
});

// 🔄 Format Match
function formatMatch(fixture) {
  const { teams, goals, fixture: fx } = fixture;
  const home = teams.home.name;
  const away = teams.away.name;
  const status = fx.status.short;
  const score = `${goals.home ?? "-"} : ${goals.away ?? "-"}`;
  const time = dayjs(fx.date).format("HH:mm");
  return `🏟️ ${home} vs ${away}\n⏱️ ${status} | 🕒 ${time} | 🔢 ${score}\n`;
}

// 📦 Fetch Fixtures by Date + Optional Filter
async function getFixturesByDate(date, filter = "") {
  try {
    const res = await axios.get(`${API_URL}/fixtures?date=${date}`, { headers });
    const fixtures = res.data.response;

    const filtered = filter
      ? fixtures.filter(
          (fx) =>
            fx.league.name.toLowerCase().includes(filter.toLowerCase()) ||
            fx.league.country.toLowerCase().includes(filter.toLowerCase()),
        )
      : fixtures;

    return filtered.map(formatMatch).join("\n") || "❌ No matches found.";
  } catch (err) {
    console.error(err);
    return "⚠️ Error fetching fixtures.";
  }
}

// 🔴 Live Matches
bot.hears("🔴 Live Matches", async (ctx) => {
  try {
    const res = await axios.get(`${API_URL}/fixtures?live=all`, { headers });
    const liveFixtures = res.data.response;

    if (liveFixtures.length === 0) {
      return ctx.reply("📭 No live matches now.");
    }

    const text = liveFixtures.map(formatMatch).join("\n");
    await sendChunkedMessage(ctx, `🔴 Live Matches:\n\n${text}`);
  } catch (err) {
    console.error(err);
    ctx.reply("⚠️ Could not load live matches.");
  }
});

// 📅 Today
bot.hears("📅 Today", async (ctx) => {
  const today = dayjs().format("YYYY-MM-DD");
  const text = await getFixturesByDate(today);
  await sendChunkedMessage(ctx, `📅 Fixtures for Today:\n\n${text}`);
});

// 📆 Tomorrow
bot.hears("📆 Tomorrow", async (ctx) => {
  const tomorrow = dayjs().add(1, "day").format("YYYY-MM-DD");
  const text = await getFixturesByDate(tomorrow);
  await sendChunkedMessage(ctx, `📆 Fixtures for Tomorrow:\n\n${text}`);
});

// 🌍 Popular Leagues
bot.hears("🌍 Popular Leagues", async (ctx) => {
  ctx.reply(
    "Choose a league:",
    Markup.keyboard([
      ["🇪🇸 La Liga", "🇬🇧 Premier League"],
      ["🇮🇹 Serie A", "🇫🇷 Ligue 1"],
      ["🇩🇪 Bundesliga", "🇳🇱 Eredivisie"],
      ["🔙 Back"],
    ]).resize(),
  );
});

bot.hears(
  [
    "🇪🇸 La Liga",
    "🇬🇧 Premier League",
    "🇮🇹 Serie A",
    "🇫🇷 Ligue 1",
    "🇩🇪 Bundesliga",
    "🇳🇱 Eredivisie",
  ],
  async (ctx) => {
    const league = ctx.message.text.split(" ").slice(1).join(" ");
    const date = dayjs().format("YYYY-MM-DD");
    const text = await getFixturesByDate(date, league);
    await sendChunkedMessage(ctx, `🏆 ${league} Fixtures:\n\n${text}`);
  },
);

// 👩 Women’s Football
bot.hears("👩 Women’s Football", async (ctx) => {
  ctx.reply(
    "Choose women’s competition:",
    Markup.keyboard([
      ["🏆 Women’s World Cup", "🌍 Women’s AFCON"],
      ["🔙 Back"],
    ]).resize(),
  );
});

bot.hears(["🏆 Women’s World Cup", "🌍 Women’s AFCON"], async (ctx) => {
  const keyword = ctx.message.text.includes("World")
    ? "Women World"
    : "Women Africa";
  const date = dayjs().format("YYYY-MM-DD");
  const text = await getFixturesByDate(date, keyword);
  await sendChunkedMessage(ctx, `👩 ${ctx.message.text}:\n\n${text}`);
});

// 🔙 Back
bot.hears("🔙 Back", (ctx) => {
  ctx.reply(
    "Choose an option:",
    Markup.keyboard([
      ["📅 Today", "📆 Tomorrow"],
      ["🔴 Live Matches"],
      ["🌍 Popular Leagues", "👩 Women’s Football"],
    ]).resize(),
  );
});

// ✅ Launch bot
bot.launch();
console.log("✅ Bot is running...");

// 🌐 Keep alive with Express (for UptimeRobot)
const app = express();
app.get("/", (req, res) => {
  res.send("✅ Football Bot is alive.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Express server running at http://localhost:${PORT}`);
});
