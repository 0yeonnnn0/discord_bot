import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  REST,
  Routes,
  TextChannel,
  ChannelType,
} from "discord.js";
import { getPresets, setActivePreset, getActivePresetId, getPreset } from "./prompt";
import { getReply } from "./ai";
import { state } from "../shared/state";
import { getQueueStats } from "./queue";
import { getStats as getRagStats } from "./rag";
import { generateImage, type ImageModel } from "./draw";
import { generateSpeech, VOICES, type VoiceName } from "./tts";

// ── Command Definitions ──
export const commands = [
  new SlashCommandBuilder()
    .setName("mode")
    .setDescription("Manage bot presets")
    .addSubcommand(sub =>
      sub.setName("list").setDescription("Show all presets")
    )
    .addSubcommand(sub =>
      sub.setName("set").setDescription("Change preset")
        .addStringOption(opt =>
          opt.setName("preset").setDescription("Preset to activate").setRequired(true).setAutocomplete(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName("current").setDescription("Show current preset")
    ),

  new SlashCommandBuilder()
    .setName("ask")
    .setDescription("Ask the bot a question")
    .addStringOption(opt =>
      opt.setName("message").setDescription("Your message").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("status")
    .setDescription("Show bot status"),

  new SlashCommandBuilder()
    .setName("summary")
    .setDescription("Summarize recent chat messages")
    .addIntegerOption(opt =>
      opt.setName("count").setDescription("Number of messages to summarize (default 50)").setMinValue(10).setMaxValue(100)
    ),

  new SlashCommandBuilder()
    .setName("draw")
    .setDescription("Generate an image with AI")
    .addStringOption(opt =>
      opt.setName("prompt").setDescription("What to draw").setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("quality").setDescription("Model quality")
        .addChoices(
          { name: "Flash (빠름)", value: "flash" },
          { name: "Pro (고품질)", value: "pro" },
        )
    ),

  new SlashCommandBuilder()
    .setName("say")
    .setDescription("봇이 음성으로 답변해줘 (TTS)")
    .addStringOption(opt =>
      opt.setName("message").setDescription("말할 내용").setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("voice").setDescription("음성 선택")
        .addChoices(
          { name: "Kore (여성, 차분)", value: "kore" },
          { name: "Aoede (여성, 밝음)", value: "aoede" },
          { name: "Leda (여성, 따뜻)", value: "leda" },
          { name: "Puck (남성, 활발)", value: "puck" },
          { name: "Charon (남성, 낮음)", value: "charon" },
          { name: "Fenrir (남성, 부드러움)", value: "fenrir" },
        )
    ),

  new SlashCommandBuilder()
    .setName("mute")
    .setDescription("봇 자동 참여를 일시 정지/해제")
    .addIntegerOption(opt =>
      opt.setName("minutes").setDescription("정지 시간 (분, 기본 30분, 0이면 해제)").setMinValue(0).setMaxValue(1440)
    ),
];

// ── Register Commands ──
export async function registerCommands(clientId: string, token: string): Promise<void> {
  const rest = new REST({ version: "10" }).setToken(token);
  try {
    console.log("슬래시 커맨드 등록 중...");
    await rest.put(Routes.applicationCommands(clientId), {
      body: commands.map(c => c.toJSON()),
    });
    console.log("슬래시 커맨드 등록 완료");
  } catch (err) {
    console.error("슬래시 커맨드 등록 실패:", (err as Error).message);
  }
}

// ── Handle Interactions ──
export async function handleInteraction(interaction: ChatInputCommandInteraction): Promise<void> {
  const { commandName } = interaction;

  switch (commandName) {
    case "mode":
      await handleMode(interaction);
      break;
    case "ask":
      await handleQuestion(interaction);
      break;
    case "status":
      await handleStatus(interaction);
      break;
    case "summary":
      await handleSummary(interaction);
      break;
    case "draw":
      await handleDraw(interaction);
      break;
    case "say":
      await handleSay(interaction);
      break;
    case "mute":
      await handleMute(interaction);
      break;
  }
}

// ── /모드 ──
async function handleMode(interaction: ChatInputCommandInteraction): Promise<void> {
  const sub = interaction.options.getSubcommand();

  if (sub === "list") {
    const presets = getPresets();
    const list = presets.map(p =>
      `${p.active ? "▸ " : "　"}**${p.name}**${p.active ? " ← current" : ""}\n　　\`/mode set preset:${p.id}\``
    ).join("\n");
    await interaction.reply({ content: `**Presets**\n\n${list}`, ephemeral: true });
    return;
  }

  if (sub === "current") {
    const id = getActivePresetId();
    const preset = getPreset(id);
    await interaction.reply({
      content: `Current preset: **${preset?.name || id}**\n\`${id}\``,
      ephemeral: true,
    });
    return;
  }

  if (sub === "set") {
    const presetId = interaction.options.getString("preset", true);
    const presets = getPresets();
    const found = presets.find(p => p.id === presetId || p.name.includes(presetId));

    if (!found) {
      await interaction.reply({ content: `\`${presetId}\` 프리셋을 찾을 수 없어`, ephemeral: true });
      return;
    }

    setActivePreset(found.id);
    await interaction.reply(`프리셋 변경됨: **${found.name}**`);
  }
}

// ── /질문 ──
async function handleQuestion(interaction: ChatInputCommandInteraction): Promise<void> {
  const message = interaction.options.getString("message", true);
  await interaction.deferReply();

  try {
    const history = [{ role: "user" as const, content: `${interaction.user.displayName}: ${message}` }];
    const reply = await getReply(history, "", interaction.user.id);
    await interaction.editReply(reply);
  } catch (err) {
    const isRateLimit = (err as Error).message?.includes("429") || (err as Error).message?.includes("quota");
    await interaction.editReply(
      isRateLimit
        ? "오늘은 너무 많이 떠들었다냥... 내일 다시 돌아온다냥! >w<"
        : "뭔가 고장났다냥... @д@"
    );
  }
}

// ── /상태 ──
async function handleStatus(interaction: ChatInputCommandInteraction): Promise<void> {
  const uptime = Date.now() - state.stats.startedAt;
  const h = Math.floor(uptime / 3600000);
  const m = Math.floor((uptime % 3600000) / 60000);
  const queue = getQueueStats();
  const rag = await getRagStats();
  const presetId = getActivePresetId();
  const preset = getPreset(presetId);

  const embed = {
    color: 0x6c8aff,
    title: "TORO Bot Status",
    fields: [
      { name: "Uptime", value: `${h}h ${m}m`, inline: true },
      { name: "Messages", value: `${state.stats.messagesProcessed}`, inline: true },
      { name: "Replies", value: `${state.stats.repliesSent}`, inline: true },
      { name: "Reply Mode", value: "AI 판단", inline: true },
      { name: "Model", value: state.config.model, inline: true },
      { name: "Preset", value: preset?.name || presetId, inline: true },
      { name: "Queue", value: `${queue.activeCount}/${queue.maxConcurrent} active`, inline: true },
      { name: "RAG Vectors", value: `${rag.vectorCount}`, inline: true },
    ],
  };

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// ── /summary ──
async function handleSummary(interaction: ChatInputCommandInteraction): Promise<void> {
  const count = interaction.options.getInteger("count") || 50;
  const channel = interaction.channel;

  if (!channel || channel.type !== ChannelType.GuildText) {
    await interaction.reply({ content: "텍스트 채널에서만 사용 가능해", ephemeral: true });
    return;
  }

  await interaction.deferReply();

  try {
    const messages = await (channel as TextChannel).messages.fetch({ limit: count });
    const sorted = [...messages.values()]
      .filter(m => !m.author.bot)
      .reverse();

    if (sorted.length === 0) {
      await interaction.editReply("요약할 메시지가 없어");
      return;
    }

    const chatLog = sorted.map(m =>
      `${m.author.displayName}: ${m.content}`
    ).join("\n");

    const summaryPrompt = `아래 디스코드 채팅 내용을 한국어로 요약해줘.
주요 주제별로 정리하고, 누가 뭘 말했는지 간략히 포함해.
3~5개 항목으로 정리해. 이모지 쓰지 마.

---
${chatLog}`;

    const history = [{ role: "user" as const, content: summaryPrompt }];
    const reply = await getReply(history, "", interaction.user.id);

    const embed = {
      color: 0x6c8aff,
      title: `💬 최근 ${sorted.length}개 메시지 요약`,
      description: reply,
      footer: { text: `#${(channel as TextChannel).name}` },
      timestamp: new Date().toISOString(),
    };

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply("요약하다가 고장났다냥... @д@ " + (err as Error).message);
  }
}

// ── /draw ──
async function handleDraw(interaction: ChatInputCommandInteraction): Promise<void> {
  const prompt = interaction.options.getString("prompt", true);
  const quality = (interaction.options.getString("quality") || "flash") as ImageModel;
  await interaction.deferReply();

  try {
    const result = await generateImage(prompt, quality);
    if (result) {
      const label = result.usedModel !== quality ? ` (${result.usedModel} fallback)` : "";
      await interaction.editReply({
        content: `**${prompt}**${label}`,
        files: [result.attachment],
      });
    } else {
      await interaction.editReply("이미지 생성에 실패했다냥... 다른 프롬프트로 다시 해보라냥 @д@");
    }
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("429") || msg.includes("quota")) {
      await interaction.editReply("오늘은 그림을 너무 많이 그렸다냥... 내일 다시 오라냥! >w<");
    } else {
      await interaction.editReply("그림 그리다가 뭔가 고장났다냥... @д@ " + msg);
    }
  }
}

// ── /say ──
async function handleSay(interaction: ChatInputCommandInteraction): Promise<void> {
  const message = interaction.options.getString("message", true);
  const voice = (interaction.options.getString("voice") || "kore") as VoiceName;
  await interaction.deferReply();

  try {
    // First get AI reply in character, then TTS it
    const h = [{ role: "user" as const, content: `${interaction.user.displayName}: ${message}` }];
    const textReply = await getReply(h, "", interaction.user.id);

    const attachment = await generateSpeech(textReply, voice);
    if (attachment) {
      await interaction.editReply({
        content: textReply,
        files: [attachment],
      });
    } else {
      await interaction.editReply(textReply + "\n\n*목소리가 안 나온다냥... @д@*");
    }
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("429") || msg.includes("quota")) {
      await interaction.editReply("오늘은 목이 너무 아프다냥... 내일 다시 말해준다냥! >w<");
    } else {
      await interaction.editReply("목소리 내다가 고장났다냥... @д@ " + msg);
    }
  }
}

// ── /mute ──
// channelId → unmute timestamp
export const mutedChannels = new Map<string, number>();

async function handleMute(interaction: ChatInputCommandInteraction): Promise<void> {
  const channelId = interaction.channelId;
  const minutes = interaction.options.getInteger("minutes") ?? 30;

  if (minutes === 0) {
    mutedChannels.delete(channelId);
    await interaction.reply("음소거 해제다냥! 다시 떠들어준다냥 >w<");
    return;
  }

  const until = Date.now() + minutes * 60 * 1000;
  mutedChannels.set(channelId, until);
  await interaction.reply(`${minutes}분간 입 다물고 있겠다냥... \`/mute 0\` 하면 다시 말해준다냥 0w0`);
}

export function isChannelMuted(channelId: string): boolean {
  const until = mutedChannels.get(channelId);
  if (!until) return false;
  if (Date.now() > until) {
    mutedChannels.delete(channelId);
    return false;
  }
  return true;
}

// ── Autocomplete ──
export async function handleAutocomplete(interaction: any): Promise<void> {
  const focused = interaction.options.getFocused(true);

  if (focused.name === "preset") {
    const presets = getPresets();
    const filtered = presets.filter(p =>
      p.id.includes(focused.value) || p.name.includes(focused.value)
    );
    await interaction.respond(
      filtered.slice(0, 25).map(p => ({
        name: `${p.name}${p.active ? " (현재)" : ""}`,
        value: p.id,
      }))
    );
  }
}
