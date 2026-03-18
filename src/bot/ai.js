const SYSTEM_PROMPT = `너는 친구들 디스코드 서버에 끼어있는 봇이야.
말투는 한국어 반말이고, 친구처럼 자연스럽게 대화에 껴들어.
너무 길게 말하지 말고, 재밌게 받아쳐. 가끔 드립도 쳐.
개발자 친구들이라 개발 드립도 환영.
답변은 1~3문장 이내로 짧게 해.`;

const provider = (process.env.AI_PROVIDER || "anthropic").toLowerCase();

async function getReply(history) {
  switch (provider) {
    case "anthropic":
      return getAnthropicReply(history);
    case "openai":
      return getOpenAIReply(history);
    case "google":
      return getGoogleReply(history);
    default:
      throw new Error(`지원하지 않는 AI_PROVIDER: ${provider}`);
  }
}

// --- Anthropic Claude ---
async function getAnthropicReply(history) {
  const Anthropic = require("@anthropic-ai/sdk");
  const client = new Anthropic();
  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: history,
  });
  return response.content[0].text;
}

// --- OpenAI GPT ---
async function getOpenAIReply(history) {
  const OpenAI = require("openai");
  const client = new OpenAI();
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
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
async function getGoogleReply(history) {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  const model = genAI.getGenerativeModel({
    model: process.env.GOOGLE_MODEL || "gemini-2.0-flash",
    systemInstruction: SYSTEM_PROMPT,
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
