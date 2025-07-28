const { Telegraf, Markup } = require("telegraf");
const axios = require("axios");
const dayjs = require("dayjs");
const express = require("express");

const bot = new Telegraf("8200700934:AAFRPZH5meOTsV66FfmFbU4xZ8004CKtgIA");
const API_KEY = "3302f2ab243c442391c71febe6055509";
const API_URL = "https://api.football-data.org/v4";

const headers = {
  "X-Auth-Token": API_KEY,
};

async function sendChunkedMessage(ctx, fullMessage) {
  const maxLength = 4000;
  if (fullMessage.length <= maxLength) return ctx.reply(fullMessage);

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
  const home = match.homeTeam.name;
  const away = match.awayTeam.name;
  const score = `${match.score.fullTime.home ?? "-"} : ${match.score.fullTime.away ?? "-"}`;
  const status = match.status;
  const time = dayjs(match.utcDate).format("HH:mm");
  return `🏟️ ${home} vs ${away}\n⏱️ ${status} | 🕒 ${time} | 🔢 ${score}\n`;
}

async function getFixturesByDate(date) {
  try {
    const res = await axios.get(`${API_URL}/matches?dateFrom=${date}&dateTo=${date}`, { headers });
    const matches = res.data.matches;
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
    const res = await axios.get(`${API_URL}/matches?status=LIVE`, { headers });
    const liveMatches = res.data.matches;
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
      ["🇫🇷 Ligue 1", "🇳🇱 Eredivisie"],
      ["🔙 Back"],
    ]).resize()
  );
});

const leagueIds = {
  "Premier League": 2021,
  "La Liga": 2014,
  "Serie A": 2019,
  "Bundesliga": 2002,
  "Ligue 1": 2015,
  "Eredivisie": 2003,
};

bot.hears(Object.keys(leagueIds).map(name => `🇬🇧 ${name}`).concat(
  ["🇪🇸 La Liga", "🇮🇹 Serie A", "🇩🇪 Bundesliga", "🇫🇷 Ligue 1", "🇳🇱 Eredivisie"]), async (ctx) => {
  const leagueName = ctx.message.text.split(" ").slice(1).join(" ");
  const leagueId = leagueIds[leagueName];
  const date = dayjs().format("YYYY-MM-DD");
  try {
    const res = await axios.get(`${API_URL}/competitions/${leagueId}/matches?dateFrom=${date}&dateTo=${date}`, { headers });
    const matches = res.data.matches;
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
