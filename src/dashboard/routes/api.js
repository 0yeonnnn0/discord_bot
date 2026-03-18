const { Router } = require("express");
const { client } = require("../../bot/client");
const { state, getTopKeywords, getUserStatsRanked } = require("../../shared/state");
const {
  getPresets, getPreset, getActivePresetId, setActivePreset,
  upsertPreset, deletePreset, getActivePrompt,
} = require("../../bot/prompt");
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
  const { replyChance, aiProvider, model } = req.body;
  if (replyChance !== undefined) {
    const value = parseFloat(replyChance);
    if (isNaN(value) || value < 0 || value > 1) {
      return res.status(400).json({ error: "replyChance는 0~1 사이 값이어야 합니다" });
    }
    state.config.replyChance = value;
  }
  if (aiProvider !== undefined) {
    if (!["google", "openai", "anthropic"].includes(aiProvider)) {
      return res.status(400).json({ error: "잘못된 aiProvider" });
    }
    state.config.aiProvider = aiProvider;
  }
  if (model !== undefined) {
    state.config.model = model;
  }
  res.json(state.config);
});

router.get("/logs", (req, res) => {
  let logs = state.logs;
  const { channel, limit } = req.query;
  if (channel) logs = logs.filter((l) => l.channel === channel);
  if (limit) logs = logs.slice(-parseInt(limit));
  res.json(logs);
});

router.get("/user-stats", (req, res) => res.json(getUserStatsRanked()));
router.get("/keywords", (req, res) => res.json(getTopKeywords(parseInt(req.query.limit) || 20)));
router.get("/rag-stats", async (req, res) => res.json(await getRagStats()));
router.get("/events", (req, res) => res.json(state.events.slice().reverse()));
router.get("/errors", (req, res) => res.json(state.errors.slice().reverse()));

// ── 프리셋 API ──
router.get("/presets", (req, res) => {
  res.json({ presets: getPresets(), activeId: getActivePresetId() });
});

router.get("/presets/:id", (req, res) => {
  const preset = getPreset(req.params.id);
  if (!preset) return res.status(404).json({ error: "프리셋 없음" });
  res.json({ id: req.params.id, ...preset });
});

router.put("/presets/:id/activate", (req, res) => {
  if (!setActivePreset(req.params.id)) {
    return res.status(404).json({ error: "프리셋 없음" });
  }
  res.json({ activeId: req.params.id });
});

router.put("/presets/:id", (req, res) => {
  upsertPreset(req.params.id, req.body);
  res.json({ id: req.params.id, ...getPreset(req.params.id) });
});

router.post("/presets", (req, res) => {
  const id = req.body.id || `custom_${Date.now()}`;
  upsertPreset(id, req.body);
  res.json({ id, ...getPreset(id) });
});

router.delete("/presets/:id", (req, res) => {
  if (!deletePreset(req.params.id)) {
    return res.status(400).json({ error: "기본 프리셋은 삭제할 수 없습니다" });
  }
  res.json({ ok: true });
});

// 하위 호환: 기존 prompt API는 활성 프리셋의 프롬프트를 반환
router.get("/prompt", (req, res) => {
  const preset = getPreset(getActivePresetId());
  res.json({ prompt: preset?.prompt || "", presetId: getActivePresetId() });
});

// 응답 테스트
router.post("/test-reply", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "message가 필요합니다" });
  try {
    const history = [{ role: "user", content: `테스터: ${message}` }];
    const reply = await getReply(history, "", process.env.OWNER_ID || "");
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
