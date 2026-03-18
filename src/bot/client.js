const { Client, GatewayIntentBits } = require("discord.js");
const { getReply } = require("./ai");
const history = require("./history");
const rag = require("./rag");
const { state, addLog, trackUser, trackKeywords } = require("../shared/state");
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

client.once("ready", () => {
  console.log(`봇 로그인 완료: ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const channelId = message.channel.id;

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

  trackUser(message.author.id, message.author.displayName, shouldReply);

  addLog({
    channel: message.channel.name,
    author: message.author.displayName,
    content: message.content,
    botReplied: shouldReply,
    botReply: null,
  });

  if (!shouldReply) return;

  // 유저 쿨다운 체크 (멘션은 쿨다운 무시)
  if (!isMentioned && !canUserRequest(message.author.id)) return;

  markUserRequest(message.author.id);

  // 큐에 넣어서 동시 호출 수 제한
  // 큐에 대기 중인 게 있으면 "잠시 기다려달라냥" 먼저 보내기
  let waitingMsg = null;
  const queueDelay = setTimeout(async () => {
    try {
      waitingMsg = await message.reply("잠시 기다려달라냥... 0w0");
    } catch {}
  }, 2000);

  try {
    const reply = await enqueue(async () => {
      const channelHistory = history.getHistory(channelId);
      const ragResults = await rag.searchRelevant(message.content);
      const ragContext = rag.formatContext(ragResults);
      return getReply(channelHistory, ragContext, message.author.id);
    });

    clearTimeout(queueDelay);

    // null이면 큐 타임아웃으로 스킵된 것
    if (!reply) {
      if (waitingMsg) await waitingMsg.delete().catch(() => {});
      return;
    }

    // 대기 메시지가 있으면 수정, 없으면 새로 보내기
    if (waitingMsg) {
      await waitingMsg.edit(reply);
    } else {
      await message.reply(reply);
    }

    history.addMessage(channelId, {
      role: "assistant",
      content: reply,
    });

    state.stats.repliesSent++;

    const lastLog = state.logs[state.logs.length - 1];
    if (lastLog) {
      lastLog.botReply = reply;
    }
  } catch (err) {
    clearTimeout(queueDelay);
    console.error("응답 생성 실패:", err.message);

    const isRateLimit = err.message?.includes("429") || err.message?.includes("quota");
    const errorMsg = isRateLimit
      ? "오늘은 너무 많이 떠들었다냥... 내일 다시 돌아온다냥! >w<"
      : "뭔가 고장났다냥... @д@";

    if (waitingMsg) {
      await waitingMsg.edit(errorMsg).catch(() => {});
    } else {
      await message.reply(errorMsg).catch(() => {});
    }
  }
});

async function start() {
  await client.login(process.env.DISCORD_TOKEN);
}

module.exports = { client, start };
