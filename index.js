const { Telegraf, Markup } = require("telegraf");
const axios = require("axios");
const dayjs = require("dayjs");
const express = require("express");

const bot = new Telegraf("8200700934:AAFRPZH5meOTsV66FfmFbU4xZ8004CKtgIA");
const API_KEY = "a1af4a9ad052e46cd40c0766daa7ad59";
const API_URL = "https://v3.football.api-sports.io";

const headers = {
  "x-apisports-key": API_KEY,
};

async function sendChunkedMessage(ctx, fullMessage) {
  const maxLength = 4000;
  if (fullMessage.length <= maxLength) return ctx.reply(fullMessage);

  const chunks = [];
  let remaining = fullMessage;
  while (remaining.length > 0) {
    let chunk = remaining.slice(0, maxLength);
    const lastBreak = chunk.lastIndexOf("\n\ud83c\udfdf\ufe0f");
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

bot.start((ctx) => {
  ctx.reply(
    "⚽ Welcome to Football Fixtures Bot!\n\nChoose an option:",
    Markup.keyboard([
      ["📅 Today", "📆 Tomorrow"],
      ["🔴 Live Matches"],
      ["🌍 Popular Leagues"],
    ]).resize()
  );
});

function formatMatch(match) {
  const home = match.teams.home.name;
  const away = match.teams.away.name;
  const score = `${match.goals.home ?? "-"} : ${match.goals.away ?? "-"}`;
  const status = match.fixture.status.long;
  const time = dayjs(match.fixture.date).format("HH:mm");
  return `🏟️ ${home} vs ${away}\n⏱️ ${status} | 🕒 ${time} | 🔢 ${score}\n`;
}

async function getFixturesByDate(date) {
  try {
    const res = await axios.get(`${API_URL}/fixtures?date=${date}`, { headers });
    const matches = res.data.response;
    console.log(`✅ Found ${matches.length} matches for ${date}`);
    return matches.map(formatMatch).join("\n") || "❌ No matches found.";
  } catch (err) {
    console.error(err);
    return "⚠️ Error fetching fixtures.";
  }
}

bot.hears("📅 Today", async (ctx) => {
  const today = dayjs().format("YYYY-MM-DD");
  const text = await getFixturesByDate(today);
  await sendChunkedMessage(ctx, `📅 Fixtures for Today:\n\n${text}`);
});

bot.hears("📆 Tomorrow", async (ctx) => {
  const tomorrow = dayjs().add(1, "day").format("YYYY-MM-DD");
  const text = await getFixturesByDate(tomorrow);
  await sendChunkedMessage(ctx, `📆 Fixtures for Tomorrow:\n\n${text}`);
});

bot.hears("🔴 Live Matches", async (ctx) => {
  try {
    const res = await axios.get(`${API_URL}/fixtures?live=all`, { headers });
    const liveMatches = res.data.response;
    if (!liveMatches.length) return ctx.reply("📭 No live matches now.");
    const text = liveMatches.map(formatMatch).join("\n");
    await sendChunkedMessage(ctx, `🔴 Live Matches:\n\n${text}`);
  } catch (err) {
    console.error(err);
    ctx.reply("⚠️ Could not load live matches.");
  }
});

bot.hears("🌍 Popular Leagues", async (ctx) => {
  ctx.reply(
    "Choose a league:",
    Markup.keyboard([
      ["🇬🇧 Premier League", "🇪🇸 La Liga"],
      ["🇮🇹 Serie A", "🇩🇪 Bundesliga"],
      ["🇫🇷 Ligue 1", "🇳🇬 NPFL"],
      ["🏆 Champions League", "🔙 Back"],
    ]).resize()
  );
});

const leagueIds = {
  "Premier League": 39,
  "La Liga": 140,
  "Serie A": 135,
  "Bundesliga": 78,
  "Ligue 1": 61,
  "Champions League": 2,
  "NPFL": 268,
};

bot.hears(Object.keys(leagueIds).map(name => `🏆 ${name}`).concat([
  "🇬🇧 Premier League", "🇪🇸 La Liga", "🇮🇹 Serie A", "🇩🇪 Bundesliga", "🇫🇷 Ligue 1", "🇳🇬 NPFL"
]), async (ctx) => {
  const nameMap = {
    "🇬🇧 Premier League": "Premier League",
    "🇪🇸 La Liga": "La Liga",
    "🇮🇹 Serie A": "Serie A",
    "🇩🇪 Bundesliga": "Bundesliga",
    "🇫🇷 Ligue 1": "Ligue 1",
    "🇳🇬 NPFL": "NPFL",
  };

  const leagueName = nameMap[ctx.message.text] || ctx.message.text.split(" ").slice(1).join(" ");
  const leagueId = leagueIds[leagueName];
  const date = dayjs().format("YYYY-MM-DD");

  try {
    const res = await axios.get(`${API_URL}/fixtures?league=${leagueId}&season=2024&date=${date}`, { headers });
    const matches = res.data.response;
    const text = matches.map(formatMatch).join("\n") || `❌ No matches for ${leagueName}.`;
    await sendChunkedMessage(ctx, `🏆 ${leagueName} Fixtures:\n\n${text}`);
  } catch (err) {
    console.error(err);
    ctx.reply("⚠️ Could not load league fixtures.");
  }
});

bot.hears("🔙 Back", (ctx) => {
  ctx.reply(
    "Choose an option:",
    Markup.keyboard([
      ["📅 Today", "📆 Tomorrow"],
      ["🔴 Live Matches"],
      ["🌍 Popular Leagues"],
    ]).resize()
  );
});

const app = express();
app.use(express.json());
app.use(bot.webhookCallback("/webhook"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`🌐 Express server running at http://localhost:${PORT}`);
  await bot.telegram.setWebhook(`https://footfixt-1.onrender.com/webhook`);
});
