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
    .setName("chance")
    .setDescription("Set auto-reply chance")
    .addIntegerOption(opt =>
      opt.setName("percent").setDescription("0~100").setRequired(true).setMinValue(0).setMaxValue(100)
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
    case "chance":
      await handleChance(interaction);
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
  const percent = interaction.options.getInteger("percent", true);
  state.config.replyChance = percent / 100;
  await interaction.reply(`자동 응답 확률 변경: **${percent}%**`);
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
