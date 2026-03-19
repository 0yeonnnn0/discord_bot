import { buildPromptWithCustom } from "./prompt";
import { state } from "../shared/state";
import { addEvent } from "../shared/state";
import type { HistoryMessage } from "./history";

const FALLBACK_MODEL = "gemma-3-27b-it";

export async function getReply(history: HistoryMessage[], ragContext: string = "", userId: string = ""): Promise<string> {
  const basePrompt = buildPromptWithCustom(userId);
  const prompt = ragContext ? basePrompt + ragContext : basePrompt;
  return callAI(history, prompt);
}

const JUDGE_PROMPT = `너는 디스코드 채팅방을 지켜보는 봇이야.
아래 대화를 보고, 네가 자연스럽게 끼어들 수 있는 상황이면 답변해.
끼어드는 게 어색하거나 굳이 필요 없으면 정확히 "<SKIP>"이라고만 답해.

끼어들면 좋은 상황:
- 너에 대한 이야기가 나올 때
- 네가 알만한 주제로 대화할 때
- 재밌는 드립을 칠 수 있을 때
- 누군가 질문을 던졌는데 아무도 안 답할 때
- 분위기가 심심해 보일 때

끼어들지 말아야 할 상황:
- 둘이서 진지한 대화 중일 때
- 이미 대화가 잘 흘러가고 있을 때
- 맥락을 모르는 대화일 때
- 방금 네가 이미 말한 직후일 때`;

export async function judgeAndReply(history: HistoryMessage[], ragContext: string = "", userId: string = ""): Promise<string | null> {
  const basePrompt = buildPromptWithCustom(userId);
  const prompt = JUDGE_PROMPT + "\n\n" + basePrompt + (ragContext || "");
  const reply = await callAI(history, prompt);
  if (reply.trim() === "<SKIP>") return null;
  return reply;
}

export async function callAI(history: HistoryMessage[], prompt: string): Promise<string> {
  const provider = state.config.aiProvider;
  const model = state.config.model;

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

    // If the current model is already the fallback, don't retry
    if (!isRetryable || model === FALLBACK_MODEL) throw err;

    console.warn(`[AI Fallback] ${provider}/${model} 실패 (${msg.slice(0, 80)}), ${FALLBACK_MODEL}로 재시도`);
    addEvent("ai_fallback", `${provider}/${model} → ${FALLBACK_MODEL}`);

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
  const m = genAI.getGenerativeModel({
    model: model || "gemini-2.5-flash-lite",
    systemInstruction: prompt,
  });

  const contents = history.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  const result = await m.generateContent({ contents });
  return result.response.text();
}

console.log(`AI: ${state.config.aiProvider} / ${state.config.model}`);
