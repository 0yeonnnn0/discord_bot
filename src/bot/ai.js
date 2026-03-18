const { buildPromptWithCustom } = require("./prompt");
const { state } = require("../shared/state");

async function getReply(history, ragContext = "", userId = "") {
  const basePrompt = buildPromptWithCustom(userId);
  const prompt = ragContext
    ? basePrompt + ragContext
    : basePrompt;

  const provider = state.config.aiProvider;
  const model = state.config.model;

  switch (provider) {
    case "anthropic":
      return getAnthropicReply(history, prompt, model);
    case "openai":
      return getOpenAIReply(history, prompt, model);
    case "google":
      return getGoogleReply(history, prompt, model);
    default:
      throw new Error(`지원하지 않는 AI_PROVIDER: ${provider}`);
  }
}

// --- Anthropic Claude ---
async function getAnthropicReply(history, prompt, model) {
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

// --- OpenAI GPT ---
async function getOpenAIReply(history, prompt, model) {
  const OpenAI = require("openai");
  const client = new OpenAI();
  const messages = [
    { role: "system", content: prompt },
    ...history,
  ];
  const response = await client.chat.completions.create({
    model: model || "gpt-4o",
    max_tokens: 512,
    messages,
  });
  return response.choices[0].message.content;
}

// --- Google Gemini ---
async function getGoogleReply(history, prompt, model) {
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

module.exports = { getReply };
