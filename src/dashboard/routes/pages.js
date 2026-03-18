const { Router } = require("express");
const { client } = require("../../bot/client");
const { state, getTopKeywords, getUserStatsRanked } = require("../../shared/state");
const { getActivePrompt } = require("../../bot/prompt");
const { getStats: getRagStats } = require("../../bot/rag");

const router = Router();

router.get("/", async (req, res) => {
  const ragStats = await getRagStats();
  res.render("index", {
    online: client.isReady(),
    botTag: client.user?.tag || "오프라인",
    uptime: Date.now() - state.stats.startedAt,
    stats: state.stats,
    config: state.config,
    userStats: getUserStatsRanked(),
    keywords: getTopKeywords(20),
    ragStats,
  });
});

router.get("/logs", (req, res) => {
  res.render("logs", { logs: state.logs.slice().reverse() });
});

router.get("/settings", async (req, res) => {
  const ragStats = await getRagStats();
  res.render("settings", {
    config: state.config,
    prompt: getActivePrompt(),
    ragStats,
  });
});

module.exports = router;
