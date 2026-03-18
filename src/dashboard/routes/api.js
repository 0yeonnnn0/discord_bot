const { Router } = require("express");
const { client } = require("../../bot/client");
const { state } = require("../../shared/state");

const router = Router();

router.get("/status", (req, res) => {
  res.json({
    online: client.isReady(),
    uptime: Date.now() - state.stats.startedAt,
    guilds: client.guilds?.cache.size || 0,
    stats: state.stats,
    config: state.config,
  });
});

router.get("/config", (req, res) => {
  res.json(state.config);
});

router.put("/config", (req, res) => {
  const { replyChance } = req.body;
  if (replyChance !== undefined) {
    const value = parseFloat(replyChance);
    if (isNaN(value) || value < 0 || value > 1) {
      return res.status(400).json({ error: "replyChance는 0~1 사이 값이어야 합니다" });
    }
    state.config.replyChance = value;
  }
  res.json(state.config);
});

router.get("/logs", (req, res) => {
  let logs = state.logs;
  const { channel, limit } = req.query;
  if (channel) {
    logs = logs.filter((l) => l.channel === channel);
  }
  if (limit) {
    logs = logs.slice(-parseInt(limit));
  }
  res.json(logs);
});

module.exports = router;
