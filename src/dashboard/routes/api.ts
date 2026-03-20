import { Router, Request, Response } from "express";
import multer from "multer";
import { client } from "../../bot/client";
import { state, saveState, getTopKeywords, getUserStatsRanked } from "../../shared/state";
import {
  getPresets, getPreset, getActivePresetId, setActivePreset,
  upsertPreset, deletePreset, togglePreset, reorderPresets, getActivePrompt,
} from "../../bot/prompt";
import { getStats as getRagStats, listVectors, searchRelevant, storeConversation, initIndex } from "../../bot/rag";
import { getReply, callAI, lastUsedModel, DEFAULT_JUDGE_PROMPT } from "../../bot/ai";
import { getQueueStats } from "../../bot/queue";
import { addChatLog, getChatLogs, getChatLogStats } from "../chat-logs";
import fs from "fs";
import path from "path";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
const router = Router();

// ── Public Chat API (no auth required) ──
router.get("/chat/characters", (_req: Request, res: Response) => {
  const all = getPresets(true); // enabled only
  const characters = all.map(p => ({ id: p.id, name: p.name, description: p.description }));
  res.json(characters);
});

router.post("/chat/send", async (req: Request, res: Response) => {
  const { characterId, message, sessionId, nickname, history } = req.body;
  if (!characterId || !message || !sessionId) {
    return res.status(400).json({ error: "characterId, message, sessionId가 필요합니다" });
  }

  try {
    const preset = getPreset(characterId);
    if (!preset) return res.status(404).json({ error: "캐릭터를 찾을 수 없습니다" });

    const chatHistory = (history || []).slice(-10).map((m: any) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
    const userContent = state.config.webShowNickname ? `${nickname || "익명"}: ${message}` : message;
    chatHistory.push({ role: "user" as const, content: userContent });

    let prompt = preset.prompt + (preset.userSuffix || "");
    if (state.config.webSystemPrompt) prompt += "\n\n" + state.config.webSystemPrompt;
    const reply = await callAI(chatHistory, prompt);

    // Log the chat
    addChatLog({
      sessionId,
      characterId,
      characterName: preset.name,
      nickname: nickname || "익명",
      userMessage: message,
      botReply: reply,
      model: lastUsedModel,
    });

    res.json({ reply });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

function maskKey(key: string | undefined): string {
  if (!key || key.length < 8) return key ? "****" : "";
  return key.slice(0, 4) + "..." + key.slice(-3);
}

function safeConfig() {
  const { googleApiKey, openaiApiKey, anthropicApiKey, dashboardSecret, ...safe } = state.config;
  return safe;
}

router.get("/status", (_req: Request, res: Response) => {
  res.json({
    online: client.isReady(),
    uptime: Date.now() - state.stats.startedAt,
    guilds: client.guilds?.cache.size || 0,
    stats: state.stats,
    queue: getQueueStats(),
    config: safeConfig(),
  });
});

router.get("/config", (_req: Request, res: Response) => res.json({ ...safeConfig(), defaultJudgePrompt: DEFAULT_JUDGE_PROMPT }));

// ── API Keys (masked read / update) ──
router.get("/keys", (_req: Request, res: Response) => {
  res.json({
    googleApiKey: maskKey(state.config.googleApiKey || process.env.GOOGLE_API_KEY),
    openaiApiKey: maskKey(state.config.openaiApiKey || process.env.OPENAI_API_KEY),
    anthropicApiKey: maskKey(state.config.anthropicApiKey || process.env.ANTHROPIC_API_KEY),
    dashboardSecret: maskKey(state.config.dashboardSecret || process.env.DASHBOARD_SECRET),
  });
});

router.put("/keys", (req: Request, res: Response) => {
  const { googleApiKey, openaiApiKey, anthropicApiKey, dashboardSecret } = req.body;
  if (googleApiKey !== undefined && googleApiKey !== "") state.config.googleApiKey = googleApiKey;
  if (openaiApiKey !== undefined && openaiApiKey !== "") state.config.openaiApiKey = openaiApiKey;
  if (anthropicApiKey !== undefined && anthropicApiKey !== "") state.config.anthropicApiKey = anthropicApiKey;
  if (dashboardSecret !== undefined && dashboardSecret !== "") state.config.dashboardSecret = dashboardSecret;
  saveState();
  res.json({ ok: true });
});

router.put("/config", (req: Request, res: Response) => {
  const { aiProvider, model, replyMode, judgeInterval, judgeThreshold } = req.body;
  if (aiProvider !== undefined) {
    if (!["google", "openai", "anthropic"].includes(aiProvider)) {
      return res.status(400).json({ error: "잘못된 aiProvider" });
    }
    state.config.aiProvider = aiProvider;
  }
  if (model !== undefined) state.config.model = model;
  if (replyMode !== undefined) {
    if (!["auto", "interval", "mute"].includes(replyMode)) {
      return res.status(400).json({ error: "replyMode는 auto, interval, mute 중 하나" });
    }
    state.config.replyMode = replyMode;
  }
  if (judgeInterval !== undefined) {
    const v = parseInt(judgeInterval);
    if (isNaN(v) || v < 10 || v > 600) return res.status(400).json({ error: "judgeInterval은 10~600초" });
    state.config.judgeInterval = v;
  }
  if (judgeThreshold !== undefined) {
    const v = parseInt(judgeThreshold);
    if (isNaN(v) || v < 1 || v > 50) return res.status(400).json({ error: "judgeThreshold는 1~50" });
    state.config.judgeThreshold = v;
  }
  if (req.body.judgePrompt !== undefined) {
    state.config.judgePrompt = req.body.judgePrompt;
  }
  if (req.body.webShowNickname !== undefined) {
    state.config.webShowNickname = !!req.body.webShowNickname;
  }
  if (req.body.webSystemPrompt !== undefined) {
    state.config.webSystemPrompt = req.body.webSystemPrompt;
  }
  res.json(safeConfig());
});

router.get("/logs", (req: Request, res: Response) => {
  let logs = state.logs;
  const channel = req.query.channel as string | undefined;
  const limit = req.query.limit as string | undefined;
  if (channel) logs = logs.filter((l) => l.channel === channel);
  if (limit) logs = logs.slice(-parseInt(limit));
  res.json(logs);
});

router.get("/user-stats", (_req: Request, res: Response) => res.json(getUserStatsRanked()));
router.get("/keywords", (req: Request, res: Response) => res.json(getTopKeywords(parseInt(req.query.limit as string || "20"))));
router.get("/rag-stats", async (_req: Request, res: Response) => res.json(await getRagStats()));
router.get("/events", (_req: Request, res: Response) => res.json(state.events.slice().reverse()));
router.get("/errors", (_req: Request, res: Response) => res.json(state.errors.slice().reverse()));

// Presets
router.get("/presets", (_req: Request, res: Response) => {
  res.json({ presets: getPresets(), activeId: getActivePresetId() });
});

router.put("/presets/reorder", (req: Request, res: Response) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: "ids 배열 필요" });
  reorderPresets(ids);
  res.json({ ok: true });
});

router.get("/presets/:id", (req: Request, res: Response) => {
  const preset = getPreset(req.params.id as string);
  if (!preset) return res.status(404).json({ error: "프리셋 없음" });
  res.json({ id: req.params.id as string, ...preset });
});

router.put("/presets/:id/activate", (req: Request, res: Response) => {
  if (!setActivePreset(req.params.id as string)) return res.status(404).json({ error: "프리셋 없음" });
  res.json({ activeId: req.params.id as string });
});

router.put("/presets/:id/toggle", (req: Request, res: Response) => {
  const { enabled } = req.body;
  if (typeof enabled !== "boolean") return res.status(400).json({ error: "enabled (boolean) 필요" });
  if (!togglePreset(req.params.id as string, enabled)) return res.status(404).json({ error: "프리셋 없음" });
  res.json({ id: req.params.id, enabled });
});

router.put("/presets/:id", (req: Request, res: Response) => {
  upsertPreset(req.params.id as string, req.body);
  res.json({ id: req.params.id as string, ...getPreset(req.params.id as string) });
});

router.post("/presets", (req: Request, res: Response) => {
  const id = req.body.id || `custom_${Date.now()}`;
  upsertPreset(id, req.body);
  res.json({ id, ...getPreset(id) });
});

router.delete("/presets/:id", (req: Request, res: Response) => {
  if (!deletePreset(req.params.id as string)) return res.status(400).json({ error: "프리셋을 찾을 수 없습니다" });
  res.json({ ok: true });
});

router.get("/prompt", (_req: Request, res: Response) => {
  const preset = getPreset(getActivePresetId());
  res.json({ prompt: preset?.prompt || "", presetId: getActivePresetId() });
});

// RAG
router.get("/rag/vectors", async (_req: Request, res: Response) => res.json(await listVectors()));

router.get("/rag/timeline", async (_req: Request, res: Response) => {
  const vectors = await listVectors();
  const byDate: Record<string, { date: string; stored: number; hits: number }> = {};
  for (const v of vectors) {
    const date = new Date(v.timestamp).toISOString().split("T")[0];
    if (!byDate[date]) byDate[date] = { date, stored: 0, hits: 0 };
    byDate[date].stored++;
    byDate[date].hits += v.hits;
  }
  res.json(Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)));
});

router.post("/rag/search", async (req: Request, res: Response) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: "query가 필요합니다" });
  try {
    const results = await searchRelevant(query, 5);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/rag/upload", upload.single("file"), async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: "파일이 필요합니다" });
  try {
    const text = req.file.buffer.toString("utf-8");
    const lines = text.split("\n");
    const msgRegex = /^(\d{1,2}\/\d{1,2}\/\d{2,4}\s+[오전후]+\s+\d{1,2}:\d{2}),\s*(.+?)\s*:\s*(.+)$/;
    const messages: { content: string }[] = [];

    for (const line of lines) {
      const match = line.match(msgRegex);
      if (match) messages.push({ content: `${match[2]}: ${match[3]}` });
    }

    if (messages.length === 0) {
      return res.status(400).json({ error: "파싱된 메시지가 없습니다" });
    }

    const chunkSize = 5;
    let stored = 0;
    for (let i = 0; i < messages.length; i += chunkSize) {
      await storeConversation({ channel: "kakaotalk-import", messages: messages.slice(i, i + chunkSize), timestamp: Date.now() });
      stored++;
    }

    const stats = await getRagStats();
    res.json({ parsed: messages.length, chunks: stored, totalVectors: stats.vectorCount });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.delete("/rag", async (_req: Request, res: Response) => {
  const vectorDir = path.join(__dirname, "../../../data/vectors");
  try {
    if (fs.existsSync(vectorDir)) {
      fs.rmSync(vectorDir, { recursive: true });
      fs.mkdirSync(vectorDir, { recursive: true });
    }
    await initIndex();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Test reply
router.post("/test-reply", async (req: Request, res: Response) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "message가 필요합니다" });
  try {
    const h = [{ role: "user" as const, content: `테스터: ${message}` }];
    const reply = await getReply(h, "", process.env.OWNER_ID || "");
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Chat logs (admin only)
router.get("/chat-logs", (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string || "100");
  const sessionId = req.query.sessionId as string | undefined;
  res.json(getChatLogs(limit, sessionId));
});

router.get("/chat-logs/stats", (_req: Request, res: Response) => {
  res.json(getChatLogStats());
});

export default router;
