const { Router } = require("express");
const { client } = require("../../bot/client");
const { state } = require("../../shared/state");

const router = Router();

router.get("/", (req, res) => {
  res.render("index", {
    online: client.isReady(),
    botTag: client.user?.tag || "오프라인",
    uptime: Date.now() - state.stats.startedAt,
    stats: state.stats,
    config: state.config,
  });
});

router.get("/logs", (req, res) => {
  res.render("logs", { logs: state.logs.slice().reverse() });
});

router.get("/settings", (req, res) => {
  res.render("settings", { config: state.config });
});

module.exports = router;
