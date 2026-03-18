const { Router } = require("express");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
const { client } = require("../../bot/client");
const { state, getTopKeywords, getUserStatsRanked } = require("../../shared/state");
const {
  getPresets, getPreset, getActivePresetId, setActivePreset,
  upsertPreset, deletePreset, getActivePrompt,
} = require("../../bot/prompt");
const { getStats: getRagStats, listVectors, searchRelevant } = require("../../bot/rag");
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
    return res.status(400).json({ error: "프리셋을 찾을 수 없습니다" });
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

// ── RAG: 벡터 목록 ──
router.get("/rag/vectors", async (req, res) => {
  const vectors = await listVectors();
  res.json(vectors);
});

// ── RAG: 타임라인 데이터 ──
router.get("/rag/timeline", async (req, res) => {
  const vectors = await listVectors();
  // 날짜별 그룹핑
  const byDate = {};
  for (const v of vectors) {
    const date = new Date(v.timestamp).toISOString().split("T")[0];
    if (!byDate[date]) byDate[date] = { date, stored: 0, hits: 0 };
    byDate[date].stored++;
    byDate[date].hits += v.hits;
  }
  const timeline = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  res.json(timeline);
});

// ── RAG: 검색 테스트 ──
router.post("/rag/search", async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: "query가 필요합니다" });
  try {
    const results = await searchRelevant(query, 5);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── RAG: 카카오톡 파일 업로드 ──
router.post("/rag/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "파일이 필요합니다" });

  const { storeConversation, getStats } = require("../../bot/rag");

  try {
    const text = req.file.buffer.toString("utf-8");
    const lines = text.split("\n");

    // 카카오톡 메시지 파싱: "날짜, 이름 : 메시지" 형태
    const msgRegex = /^(\d{1,2}\/\d{1,2}\/\d{2,4}\s+[오전후]+\s+\d{1,2}:\d{2}),\s*(.+?)\s*:\s*(.+)$/;
    const messages = [];

    for (const line of lines) {
      const match = line.match(msgRegex);
      if (match) {
        messages.push({
          content: `${match[2]}: ${match[3]}`,
        });
      }
    }

    if (messages.length === 0) {
      return res.status(400).json({ error: "파싱된 메시지가 없습니다. 카카오톡 내보내기 형식인지 확인하세요." });
    }

    // 5개씩 묶어서 벡터 저장
    const chunkSize = 5;
    let stored = 0;

    for (let i = 0; i < messages.length; i += chunkSize) {
      const chunk = messages.slice(i, i + chunkSize);
      await storeConversation({
        channel: "kakaotalk-import",
        messages: chunk,
        timestamp: Date.now(),
      });
      stored++;
    }

    const stats = await getStats();
    res.json({
      parsed: messages.length,
      chunks: stored,
      totalVectors: stats.vectorCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// RAG 벡터 초기화
router.delete("/rag", async (req, res) => {
  const fs = require("fs");
  const path = require("path");
  const vectorDir = path.join(__dirname, "../../../data/vectors");
  try {
    if (fs.existsSync(vectorDir)) {
      fs.rmSync(vectorDir, { recursive: true });
      fs.mkdirSync(vectorDir, { recursive: true });
    }
    const { initIndex } = require("../../bot/rag");
    await initIndex();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
