import { Client, GatewayIntentBits, Message, ChatInputCommandInteraction } from "discord.js";
import { getReply } from "./ai";
import * as history from "./history";
import * as rag from "./rag";
import { state, addLog, addEvent, addError, trackUser, trackKeywords } from "../shared/state";
import { enqueue, canUserRequest, markUserRequest } from "./queue";
import { getPresets, setActivePreset, getActivePresetId } from "./prompt";
import { registerCommands, handleInteraction, handleAutocomplete } from "./commands";

const conversationBuffer = new Map<string, { content: string }[]>();
const BUFFER_SIZE = 5;

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ── Events ──
client.once("ready", async () => {
  console.log(`봇 로그인 완료: ${client.user!.tag}`);
  addEvent("bot_ready", `${client.user!.tag} — ${client.guilds.cache.size}개 서버`);

  // 슬래시 커맨드 등록
  await registerCommands(client.user!.id, process.env.DISCORD_TOKEN || "");
});

// 슬래시 커맨드 핸들러
client.on("interactionCreate", async (interaction) => {
  if (interaction.isAutocomplete()) {
    await handleAutocomplete(interaction);
    return;
  }
  if (interaction.isChatInputCommand()) {
    await handleInteraction(interaction as ChatInputCommandInteraction);
    return;
  }
});

client.on("guildCreate", (guild) => addEvent("guild_join", `${guild.name} (${guild.memberCount}명)`));
client.on("guildDelete", (guild) => addEvent("guild_leave", guild.name));
client.on("error", (err) => addError("discord", err.message));
client.on("warn", (msg) => addEvent("discord_warn", msg));

// ── Commands ──
function handleCommand(message: Message): boolean {
  const content = message.content.trim();
  if (!content.startsWith("!모드")) return false;

  const args = content.split(/\s+/).slice(1);
  const sub = args[0];

  if (!sub || sub === "목록") {
    const presets = getPresets();
    const list = presets.map(p =>
      `${p.active ? "▸ " : "  "}**${p.name}** (\`!모드 ${p.id}\`)${p.active ? " ← 현재" : ""}`
    ).join("\n");
    message.reply(`**프리셋 목록**\n${list}`);
    return true;
  }

  const presets = getPresets();
  const found = presets.find(p => p.id === sub || p.name.includes(sub));

  if (!found) {
    message.reply(`\`${sub}\` 프리셋을 못 찾겠어. \`!모드 목록\`으로 확인해봐`);
    return true;
  }

  setActivePreset(found.id);
  message.reply(`프리셋 변경: **${found.name}**`);
  return true;
}

// ── Message handler ──
client.on("messageCreate", async (message: Message) => {
  if (message.author.bot) return;
  if (handleCommand(message)) return;

  const channelId = message.channel.id;
  const guildName = message.guild?.name || "DM";
  const channelName = "name" in message.channel ? (message.channel as any).name as string : "unknown";
  const cleanContent = message.content.replace(/<@!?\d+>/g, "").trim();

  history.addMessage(channelId, {
    role: "user",
    content: `${message.author.displayName}: ${cleanContent}`,
  });

  state.stats.messagesProcessed++;
  trackKeywords(cleanContent);

  if (!conversationBuffer.has(channelId)) {
    conversationBuffer.set(channelId, []);
  }
  const buffer = conversationBuffer.get(channelId)!;
  buffer.push({ content: `${message.author.displayName}: ${cleanContent}` });
  if (buffer.length >= BUFFER_SIZE) {
    rag.storeConversation({
      channel: channelName,
      messages: buffer.splice(0),
      timestamp: Date.now(),
    });
  }

  const isMentioned = message.mentions.has(client.user!);
  const shouldReply = isMentioned || Math.random() < state.config.replyChance;
  const triggerReason: "mention" | "random" | null = isMentioned ? "mention" : shouldReply ? "random" : null;

  trackUser(message.author.id, message.author.displayName, shouldReply);

  addLog({
    guild: guildName,
    channel: channelName,
    author: message.author.displayName,
    content: cleanContent,
    botReplied: shouldReply,
    triggerReason,
    botReply: null,
    responseTime: null,
    ragHits: 0,
    error: null,
  });

  if (!shouldReply) return;
  if (!isMentioned && !canUserRequest(message.author.id)) return;
  markUserRequest(message.author.id);

  // Queue + waiting message
  let waitingMsg: Message<boolean> | null = null;
  let waitingCancelled = false;
  let waitingSending = false;

  const queueDelay = setTimeout(async () => {
    if (waitingCancelled) return;
    waitingSending = true;
    try {
      const msg = await message.reply("잠시 기다려달라냥... 0w0");
      if (waitingCancelled) {
        await msg.delete().catch(() => {});
      } else {
        waitingMsg = msg;
      }
    } catch {}
    waitingSending = false;
  }, 2000);

  async function sendReply(text: string): Promise<void> {
    clearTimeout(queueDelay);
    waitingCancelled = true;
    if (waitingSending) await new Promise(r => setTimeout(r, 500));
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
      const ragResults = await rag.searchRelevant(cleanContent);
      ragHitCount = ragResults.length;
      const ragContext = rag.formatContext(ragResults);
      return getReply(channelHistory, ragContext, message.author.id);
    });

    const responseTime = Date.now() - startTime;

    if (!reply) {
      clearTimeout(queueDelay);
      waitingCancelled = true;
      if (waitingMsg) await (waitingMsg as Message).delete().catch(() => {});
      return;
    }

    await sendReply(reply);

    history.addMessage(channelId, { role: "assistant", content: reply });
    state.stats.repliesSent++;

    const lastLog = state.logs[state.logs.length - 1];
    if (lastLog) {
      lastLog.botReply = reply;
      lastLog.responseTime = responseTime;
      lastLog.ragHits = ragHitCount;
    }
  } catch (err) {
    const responseTime = Date.now() - startTime;
    const isRateLimit = (err as Error).message?.includes("429") || (err as Error).message?.includes("quota");

    addError(
      isRateLimit ? "rate_limit" : "api_error",
      (err as Error).message,
      `channel: ${channelName}, guild: ${guildName}`
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

export async function start(): Promise<void> {
  addEvent("bot_start", "봇 프로세스 시작");
  await client.login(process.env.DISCORD_TOKEN);
}
