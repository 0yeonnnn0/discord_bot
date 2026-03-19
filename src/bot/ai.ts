import { buildPromptWithCustom } from "./prompt";
import { state } from "../shared/state";
import { addEvent } from "../shared/state";
import type { HistoryMessage } from "./history";

const FALLBACK_MODEL = "gemma-3-27b-it";

// Tracks which model was actually used in the last callAI invocation
export let lastUsedModel = "";

export async function getReply(history: HistoryMessage[], ragContext: string = "", userId: string = ""): Promise<string> {
  const basePrompt = buildPromptWithCustom(userId);
  const prompt = ragContext ? basePrompt + ragContext : basePrompt;
  return callAI(history, prompt);
}

export const DEFAULT_JUDGE_PROMPT = `너는 디스코드 채팅방을 지켜보는 봇이야.
아래 대화를 보고, 네가 자연스럽게 끼어들 수 있는 상황이면 답변해.
끼어드는 게 어색하거나 굳이 필요 없으면 정확히 "<SKIP>"이라고만 답해.

중요: 기본값은 "<SKIP>"이야. 확실히 끼어들 만한 이유가 있을 때만 답변해. 애매하면 SKIP해.

끼어들면 좋은 상황:
- 누가 너에 대해 직접 이야기하거나 의견을 물을 때
- 네가 확실히 재밌는 드립을 칠 수 있을 때
- 질문이 공중에 떠 있고 아무도 안 답할 때
- 대화가 한참 멈춰서 분위기가 심심할 때

끼어들지 말아야 할 상황:
- 두 사람이 대화를 주고받는 중이면 절대 끼어들지 마 (티키타카 중엔 SKIP)
- 대화가 잘 흘러가고 있으면 굳이 끼어들 필요 없어
- 맥락을 잘 모르는 대화일 때
- 방금 네가 이미 말한 직후일 때
- 상대방이 아직 말을 끝내지 않은 것 같을 때
- "ㅋㅋ", "ㅇㅇ", "ㄹㅇ", "ㅇㅈ" 같은 짧은 리액션만 있을 때
- 누군가의 말에 다른 사람이 이미 잘 대답했을 때`;

function getJudgePrompt(): string {
  return state.config.judgePrompt || DEFAULT_JUDGE_PROMPT;
}

export async function judgeAndReply(history: HistoryMessage[], ragContext: string = "", userId: string = ""): Promise<string | null> {
  const basePrompt = buildPromptWithCustom(userId);
  const prompt = getJudgePrompt() + "\n\n" + basePrompt + (ragContext || "");
  const reply = await callAI(history, prompt);
  if (reply.trim() === "<SKIP>") return null;
  return reply;
}

export async function callAI(history: HistoryMessage[], prompt: string): Promise<string> {
  const provider = state.config.aiProvider;
  const model = state.config.model;
  lastUsedModel = model;

  try {
    switch (provider) {
      case "anthropic":
        return await getAnthropicReply(history, prompt, model);
      case "openai":
        return await getOpenAIReply(history, prompt, model);
      case "google":
        return await getGoogleReply(history, prompt, model);
      default:
        throw new Error(`지원하지 않는 AI_PROVIDER: ${provider}`);
    }
  } catch (err) {
    const msg = (err as Error).message || "";
    const isRetryable = msg.includes("429") || msg.includes("quota") || msg.includes("limit") || msg.includes("500") || msg.includes("503") || msg.includes("overloaded");

    if (!isRetryable || model === FALLBACK_MODEL) throw err;

    console.warn(`[AI Fallback] ${provider}/${model} 실패 (${msg.slice(0, 80)}), ${FALLBACK_MODEL}로 재시도`);
    addEvent("ai_fallback", `${provider}/${model} → ${FALLBACK_MODEL}`);

    lastUsedModel = FALLBACK_MODEL;
    return await getGoogleReply(history, prompt, FALLBACK_MODEL);
  }
}

async function getAnthropicReply(history: HistoryMessage[], prompt: string, model: string): Promise<string> {
  const Anthropic = require("@anthropic-ai/sdk");
  const client = new Anthropic();
  const response = await client.messages.create({
    model: model || "claude-sonnet-4-20250514",
    max_tokens: 512,
    system: prompt,
    messages: history,
  });
  return response.content[0].text;
}

async function getOpenAIReply(history: HistoryMessage[], prompt: string, model: string): Promise<string> {
  const OpenAI = require("openai");
  const client = new OpenAI();
  const messages = [
    { role: "system" as const, content: prompt },
    ...history,
  ];
  const response = await client.chat.completions.create({
    model: model || "gpt-4o",
    max_tokens: 512,
    messages,
  });
  return response.choices[0].message.content;
}

async function getGoogleReply(history: HistoryMessage[], prompt: string, model: string): Promise<string> {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  const isGemma = (model || "").startsWith("gemma");

  // Gemma doesn't support systemInstruction, inject prompt as first user message instead
  const m = genAI.getGenerativeModel({
    model: model || "gemini-2.5-flash-lite",
    ...(isGemma ? {} : { systemInstruction: prompt }),
  });

  const contents = [
    ...(isGemma ? [{ role: "user" as const, parts: [{ text: `[시스템 지시]\n${prompt}\n\n위 지시를 따라서 아래 대화에 응답해.` }] }, { role: "model" as const, parts: [{ text: "알겠어." }] }] : []),
    ...history.map((msg) => ({
      role: msg.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: msg.content }],
    })),
  ];

  const result = await m.generateContent({ contents });
  return result.response.text();
}

console.log(`AI: ${state.config.aiProvider} / ${state.config.model}`);
