import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  REST,
  Routes,
} from "discord.js";
import { getPresets, setActivePreset, getActivePresetId, getPreset } from "./prompt";
import { getReply } from "./ai";
import { state } from "../shared/state";
import { getQueueStats } from "./queue";
import { getStats as getRagStats } from "./rag";

// ── Command Definitions ──
export const commands = [
  new SlashCommandBuilder()
    .setName("모드")
    .setDescription("봇 프리셋 관리")
    .addSubcommand(sub =>
      sub.setName("목록").setDescription("프리셋 목록 보기")
    )
    .addSubcommand(sub =>
      sub.setName("변경").setDescription("프리셋 변경")
        .addStringOption(opt =>
          opt.setName("프리셋").setDescription("변경할 프리셋").setRequired(true).setAutocomplete(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName("현재").setDescription("현재 활성 프리셋 확인")
    ),

  new SlashCommandBuilder()
    .setName("질문")
    .setDescription("봇에게 직접 질문하기")
    .addStringOption(opt =>
      opt.setName("메시지").setDescription("질문할 내용").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("상태")
    .setDescription("봇 상태 확인"),

  new SlashCommandBuilder()
    .setName("확률")
    .setDescription("자동 응답 확률 변경")
    .addIntegerOption(opt =>
      opt.setName("퍼센트").setDescription("0~100 사이 값").setRequired(true).setMinValue(0).setMaxValue(100)
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
    case "모드":
      await handleMode(interaction);
      break;
    case "질문":
      await handleQuestion(interaction);
      break;
    case "상태":
      await handleStatus(interaction);
      break;
    case "확률":
      await handleChance(interaction);
      break;
  }
}

// ── /모드 ──
async function handleMode(interaction: ChatInputCommandInteraction): Promise<void> {
  const sub = interaction.options.getSubcommand();

  if (sub === "목록") {
    const presets = getPresets();
    const list = presets.map(p =>
      `${p.active ? "▸ " : "　"}**${p.name}**${p.active ? " ← 현재" : ""}\n　　\`/모드 변경 프리셋:${p.id}\``
    ).join("\n");
    await interaction.reply({ content: `**프리셋 목록**\n\n${list}`, ephemeral: true });
    return;
  }

  if (sub === "현재") {
    const id = getActivePresetId();
    const preset = getPreset(id);
    await interaction.reply({
      content: `현재 프리셋: **${preset?.name || id}**\n\`${id}\``,
      ephemeral: true,
    });
    return;
  }

  if (sub === "변경") {
    const presetId = interaction.options.getString("프리셋", true);
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
  const message = interaction.options.getString("메시지", true);
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
      { name: "Reply Rate", value: `${Math.round(state.config.replyChance * 100)}%`, inline: true },
      { name: "Model", value: state.config.model, inline: true },
      { name: "Preset", value: preset?.name || presetId, inline: true },
      { name: "Queue", value: `${queue.activeCount}/${queue.maxConcurrent} active`, inline: true },
      { name: "RAG Vectors", value: `${rag.vectorCount}`, inline: true },
    ],
  };

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// ── /확률 ──
async function handleChance(interaction: ChatInputCommandInteraction): Promise<void> {
  const percent = interaction.options.getInteger("퍼센트", true);
  state.config.replyChance = percent / 100;
  await interaction.reply(`자동 응답 확률 변경: **${percent}%**`);
}

// ── Autocomplete ──
export async function handleAutocomplete(interaction: any): Promise<void> {
  const focused = interaction.options.getFocused(true);

  if (focused.name === "프리셋") {
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
