const { Client, GatewayIntentBits } = require("discord.js");
const { getReply } = require("./ai");
const history = require("./history");
const rag = require("./rag");
const { state, addLog, addEvent, addError, trackUser, trackKeywords } = require("../shared/state");
const { enqueue, canUserRequest, markUserRequest } = require("./queue");

// 채널별 대화 버퍼 (일정량 모이면 벡터 저장)
const conversationBuffer = new Map();
const BUFFER_SIZE = 5;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ── 봇 이벤트 ──
client.once("ready", () => {
  console.log(`봇 로그인 완료: ${client.user.tag}`);
  addEvent("bot_ready", `${client.user.tag} — ${client.guilds.cache.size}개 서버`);
});

client.on("guildCreate", (guild) => {
  addEvent("guild_join", `${guild.name} (${guild.memberCount}명)`);
});

client.on("guildDelete", (guild) => {
  addEvent("guild_leave", guild.name);
});

client.on("error", (err) => {
  addError("discord", err.message);
});

client.on("warn", (msg) => {
  addEvent("discord_warn", msg);
});

// ── 메시지 처리 ──
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const channelId = message.channel.id;
  const guildName = message.guild?.name || "DM";

  history.addMessage(channelId, {
    role: "user",
    content: `${message.author.displayName}: ${message.content}`,
  });

  state.stats.messagesProcessed++;
  trackKeywords(message.content);

  // 대화 버퍼에 추가 (일정량 모이면 벡터 저장)
  if (!conversationBuffer.has(channelId)) {
    conversationBuffer.set(channelId, []);
  }
  const buffer = conversationBuffer.get(channelId);
  buffer.push({
    content: `${message.author.displayName}: ${message.content}`,
  });
  if (buffer.length >= BUFFER_SIZE) {
    rag.storeConversation({
      channel: message.channel.name,
      messages: buffer.splice(0),
      timestamp: Date.now(),
    });
  }

  const isMentioned = message.mentions.has(client.user);
  const shouldReply =
    isMentioned || Math.random() < state.config.replyChance;

  const triggerReason = isMentioned ? "mention" : shouldReply ? "random" : null;

  trackUser(message.author.id, message.author.displayName, shouldReply);

  addLog({
    guild: guildName,
    channel: message.channel.name,
    author: message.author.displayName,
    content: message.content,
    botReplied: shouldReply,
    triggerReason,
    botReply: null,
    responseTime: null,
    ragHits: 0,
    error: null,
  });

  if (!shouldReply) return;

  // 유저 쿨다운 체크 (멘션은 쿨다운 무시)
  if (!isMentioned && !canUserRequest(message.author.id)) return;

  markUserRequest(message.author.id);

  // 큐에 넣어서 동시 호출 수 제한
  // 대기 메시지 관리: cancelled 플래그로 race condition 방지
  let waitingMsg = null;
  let waitingCancelled = false;
  let waitingSending = false;

  const queueDelay = setTimeout(async () => {
    if (waitingCancelled) return;
    waitingSending = true;
    try {
      const msg = await message.reply("잠시 기다려달라냥... 0w0");
      if (waitingCancelled) {
        // 이미 응답이 와서 취소됨 → 대기 메시지 삭제
        await msg.delete().catch(() => {});
      } else {
        waitingMsg = msg;
      }
    } catch {}
    waitingSending = false;
  }, 2000);

  async function sendReply(text) {
    clearTimeout(queueDelay);
    waitingCancelled = true;

    // 대기 메시지가 전송 중이면 잠깐 기다림
    if (waitingSending) {
      await new Promise(r => setTimeout(r, 500));
    }

    if (waitingMsg) {
      await waitingMsg.edit(text);
    } else {
      await message.reply(text);
    }
  }

  const startTime = Date.now();

  try {
    let ragHitCount = 0;

    const reply = await enqueue(async () => {
      const channelHistory = history.getHistory(channelId);
      const ragResults = await rag.searchRelevant(message.content);
      ragHitCount = ragResults.length;
      const ragContext = rag.formatContext(ragResults);
      return getReply(channelHistory, ragContext, message.author.id);
    });

    const responseTime = Date.now() - startTime;

    // null이면 큐 타임아웃으로 스킵된 것
    if (!reply) {
      clearTimeout(queueDelay);
      waitingCancelled = true;
      if (waitingMsg) await waitingMsg.delete().catch(() => {});
      return;
    }

    await sendReply(reply);

    history.addMessage(channelId, {
      role: "assistant",
      content: reply,
    });

    state.stats.repliesSent++;

    const lastLog = state.logs[state.logs.length - 1];
    if (lastLog) {
      lastLog.botReply = reply;
      lastLog.responseTime = responseTime;
      lastLog.ragHits = ragHitCount;
    }
  } catch (err) {
    const responseTime = Date.now() - startTime;
    const isRateLimit = err.message?.includes("429") || err.message?.includes("quota");

    addError(
      isRateLimit ? "rate_limit" : "api_error",
      err.message,
      `channel: ${message.channel.name}, guild: ${guildName}`
    );

    const lastLog = state.logs[state.logs.length - 1];
    if (lastLog) {
      lastLog.responseTime = responseTime;
      lastLog.error = isRateLimit ? "rate_limit" : "api_error";
    }

    const errorMsg = isRateLimit
      ? "오늘은 너무 많이 떠들었다냥... 내일 다시 돌아온다냥! >w<"
      : "뭔가 고장났다냥... @д@";

    await sendReply(errorMsg).catch(() => {});
  }
});

async function start() {
  addEvent("bot_start", "봇 프로세스 시작");
  await client.login(process.env.DISCORD_TOKEN);
}

module.exports = { client, start };
