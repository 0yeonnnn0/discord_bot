const { Router } = require("express");
const { client } = require("../../bot/client");
const { state, getTopKeywords, getUserStatsRanked } = require("../../shared/state");
const { getActivePrompt, setCustomPrompt } = require("../../bot/prompt");
const { getStats: getRagStats } = require("../../bot/rag");
const { getReply } = require("../../bot/ai");
const { getQueueStats } = require("../../bot/queue");

const router = Router();

router.get("/status", (req, res) => {
  res.json({
    online: client.isReady(),
    uptime: Date.now() - state.stats.startedAt,
    guilds: client.guilds?.cache.size || 0,
    stats: state.stats,
    queue: getQueueStats(),
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

// 유저별 통계
router.get("/user-stats", (req, res) => {
  res.json(getUserStatsRanked());
});

// 인기 키워드
router.get("/keywords", (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  res.json(getTopKeywords(limit));
});

// RAG 통계
router.get("/rag-stats", async (req, res) => {
  const stats = await getRagStats();
  res.json(stats);
});

// 시스템 프롬프트
router.get("/prompt", (req, res) => {
  res.json({ prompt: getActivePrompt() });
});

router.put("/prompt", (req, res) => {
  const { prompt } = req.body;
  if (typeof prompt !== "string") {
    return res.status(400).json({ error: "prompt는 문자열이어야 합니다" });
  }
  setCustomPrompt(prompt.trim() || null);
  res.json({ prompt: getActivePrompt() });
});

// 프롬프트 초기화
router.delete("/prompt", (req, res) => {
  setCustomPrompt(null);
  res.json({ prompt: getActivePrompt() });
});

// 이벤트 로그
router.get("/events", (req, res) => {
  res.json(state.events.slice().reverse());
});

// 에러 로그
router.get("/errors", (req, res) => {
  res.json(state.errors.slice().reverse());
});

// 응답 테스트
router.post("/test-reply", async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "message가 필요합니다" });
  }
  try {
    const history = [{ role: "user", content: `테스터: ${message}` }];
    const reply = await getReply(history, "", process.env.OWNER_ID || "");
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
