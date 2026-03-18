const { Client, GatewayIntentBits } = require("discord.js");
const { getReply } = require("./ai");
const history = require("./history");
const rag = require("./rag");
const { state, addLog } = require("../shared/state");

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

  addLog({
    channel: message.channel.name,
    author: message.author.displayName,
    content: message.content,
    botReplied: shouldReply,
    botReply: null,
  });

  if (!shouldReply) return;

  try {
    const channelHistory = history.getHistory(channelId);

    // RAG: 관련 과거 대화 검색
    const ragResults = await rag.searchRelevant(message.content);
    const ragContext = rag.formatContext(ragResults);

    const reply = await getReply(channelHistory, ragContext, message.author.id);

    await message.reply(reply);

    history.addMessage(channelId, {
      role: "assistant",
      content: reply,
    });

    state.stats.repliesSent++;

    // 로그에 봇 답변 기록
    const lastLog = state.logs[state.logs.length - 1];
    if (lastLog) {
      lastLog.botReply = reply;
    }
  } catch (err) {
    console.error("응답 생성 실패:", err.message);
  }
});

async function start() {
  await client.login(process.env.DISCORD_TOKEN);
}

module.exports = { client, start };
