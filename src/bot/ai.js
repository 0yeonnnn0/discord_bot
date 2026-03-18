const { buildPrompt } = require("./prompt");

const provider = (process.env.AI_PROVIDER || "anthropic").toLowerCase();

async function getReply(history, ragContext = "", userId = "") {
  const basePrompt = buildPrompt(userId);
  const prompt = ragContext
    ? basePrompt + ragContext
    : basePrompt;

  switch (provider) {
    case "anthropic":
      return getAnthropicReply(history, prompt);
    case "openai":
      return getOpenAIReply(history, prompt);
    case "google":
      return getGoogleReply(history, prompt);
    default:
      throw new Error(`지원하지 않는 AI_PROVIDER: ${provider}`);
  }
}

// --- Anthropic Claude ---
async function getAnthropicReply(history, prompt) {
  const Anthropic = require("@anthropic-ai/sdk");
  const client = new Anthropic();
  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
    max_tokens: 512,
    system: prompt,
    messages: history,
  });
  return response.content[0].text;
}

// --- OpenAI GPT ---
async function getOpenAIReply(history, prompt) {
  const OpenAI = require("openai");
  const client = new OpenAI();
  const messages = [
    { role: "system", content: prompt },
    ...history,
  ];
  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o",
    max_tokens: 512,
    messages,
  });
  return response.choices[0].message.content;
}

// --- Google Gemini ---
async function getGoogleReply(history, prompt) {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  const model = genAI.getGenerativeModel({
    model: process.env.GOOGLE_MODEL || "gemini-2.0-flash",
    systemInstruction: prompt,
  });

  const contents = history.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  const result = await model.generateContent({ contents });
  return result.response.text();
}

console.log(`AI 프로바이더: ${provider}`);

module.exports = { getReply };
