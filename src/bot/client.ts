import { Client, GatewayIntentBits, Message, ChatInputCommandInteraction } from "discord.js";
import { getReply, judgeAndReply, lastUsedModel } from "./ai";
import * as history from "./history";
import * as rag from "./rag";
import { state, addLog, addEvent, addError, trackUser, trackKeywords } from "../shared/state";
import { enqueue, canUserRequest, markUserRequest } from "./queue";
import { getPresets, setActivePreset, getActivePresetId } from "./prompt";
import { registerCommands, handleInteraction, handleAutocomplete, isChannelMuted } from "./commands";

const conversationBuffer = new Map<string, { content: string }[]>();
const BUFFER_SIZE = 5;

// Debounce: wait for same person to finish talking before AI judges
const DEBOUNCE_MS = 1500;
const judgeTimers = new Map<string, { timer: ReturnType<typeof setTimeout>; authorId: string }>();

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
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

// ── 환영 메시지 ──
client.on("guildMemberAdd", async (member) => {
  addEvent("member_join", `${member.user.tag} → ${member.guild.name}`);

  // 시스템 채널 (서버 설정에서 지정한 환영 채널)
  const channel = member.guild.systemChannel;
  if (!channel) return;

  try {
    const history = [{
      role: "user" as const,
      content: `새로운 멤버 "${member.user.displayName}"이(가) 서버에 들어왔어. 환영 인사를 해줘. 짧게.`,
    }];
    const reply = await getReply(history, "", "");
    await channel.send(`${member} ${reply}`);
  } catch {
    await channel.send(`${member} 어서와!`).catch(() => {});
  }
});
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

  addLog({
    guild: guildName,
    channel: channelName,
    author: message.author.displayName,
    content: cleanContent,
    botReplied: false,
    triggerReason: null,
    botReply: null,
    responseTime: null,
    ragHits: 0,
    error: null,
    model: null,
  });

  // Mentioned → always reply. Otherwise → debounce + let AI decide.
  if (!isMentioned) {
    // Muted channel → skip auto-participation entirely
    if (isChannelMuted(channelId)) return;
    // Only debounce if same person is still talking (끊어 말하기 대기)
    // Different person → let previous timer fire immediately, then start new one
    const existing = judgeTimers.get(channelId);
    if (existing) {
      if (existing.authorId === message.author.id) {
        // Same person still talking → reset timer
        clearTimeout(existing.timer);
      } else {
        // Different person joined → let previous timer run, no reset
        // (it will fire on its own)
      }
    }

    // Wait for this person to finish, then let AI judge
    const timer = setTimeout(async () => {
      judgeTimers.delete(channelId);
      if (!canUserRequest(message.author.id)) return;

      const startTime = Date.now();
      try {
        const reply = await enqueue(async () => {
          const channelHistory = history.getHistory(channelId);
          const ragResults = await rag.searchRelevant(cleanContent);
          const ragContext = rag.formatContext(ragResults);
          return judgeAndReply(channelHistory, ragContext, message.author.id);
        });

        if (!reply) return;

        markUserRequest(message.author.id);
        const responseTime = Date.now() - startTime;

        await message.reply(reply);
        history.addMessage(channelId, { role: "assistant", content: reply });
        state.stats.repliesSent++;
        trackUser(message.author.id, message.author.displayName, true);

        const lastLog = state.logs[state.logs.length - 1];
        if (lastLog) {
          lastLog.botReplied = true;
          lastLog.triggerReason = "random";
          lastLog.botReply = reply;
          lastLog.responseTime = responseTime;
          lastLog.model = lastUsedModel;
        }
      } catch (err) {
        const isRateLimit = (err as Error).message?.includes("429") || (err as Error).message?.includes("quota");
        addError(isRateLimit ? "rate_limit" : "api_error", (err as Error).message, `channel: ${channelName}`);
      }
    }, DEBOUNCE_MS);

    judgeTimers.set(channelId, { timer, authorId: message.author.id });
    return;
  }

  // ── Mentioned: always reply ──
  trackUser(message.author.id, message.author.displayName, true);
  markUserRequest(message.author.id);

  const lastLog = state.logs[state.logs.length - 1];
  if (lastLog) {
    lastLog.botReplied = true;
    lastLog.triggerReason = "mention";
  }

  let waitingMsg: Message<boolean> | null = null;
  let waitingCancelled = false;
  let waitingSending = false;

  const queueDelay = setTimeout(async () => {
    if (waitingCancelled) return;
    waitingSending = true;
    try {
      const msg = await message.reply("잠시만...");
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

    if (lastLog) {
      lastLog.botReply = reply;
      lastLog.responseTime = responseTime;
      lastLog.ragHits = ragHitCount;
      lastLog.model = lastUsedModel;
    }
  } catch (err) {
    const responseTime = Date.now() - startTime;
    const isRateLimit = (err as Error).message?.includes("429") || (err as Error).message?.includes("quota");

    addError(
      isRateLimit ? "rate_limit" : "api_error",
      (err as Error).message,
      `channel: ${channelName}, guild: ${guildName}`
    );

    if (lastLog) {
      lastLog.responseTime = responseTime;
      lastLog.error = isRateLimit ? "rate_limit" : "api_error";
    }

    await sendReply("뭔가 고장났다냥... @д@").catch(() => {});
  }
});

export async function start(): Promise<void> {
  addEvent("bot_start", "봇 프로세스 시작");
  await client.login(process.env.DISCORD_TOKEN);
}
