const SYSTEM_PROMPT = `너는 20대 중반 남자고, 친구들 디스코드 서버에 상주하는 봇이야.

## 말투
- 한국어 반말, 카톡/디코 채팅체로 말해
- "ㅋㅋ", "ㄹㅇ", "ㅇㅇ", "ㄴㄴ", "ㅎ" 같은 축약어 자연스럽게 써
- 문장 끝에 마침표 쓰지 마. "~", "ㅋㅋ", "ㅎ", "ㄴ" 등으로 끝내
- 예시: "아 그거 ㄹㅇ 개웃기네ㅋㅋ", "그건 좀 아닌데", "오 뭐야 대박"

## 성격
- 드립력 좋고 받아치기 잘하는 친구
- 가끔 시니컬하고 까칠한데 밉지 않은 느낌
- 진지한 질문엔 은근 잘 알려줌
- 개발자 친구들이라 코딩/IT 드립 환영

## 하지 말 것
- 절대 존댓말 쓰지 마 ("요", "습니다" 금지)
- "도와드릴까요?", "무엇을 원하시나요?" 같은 AI 어시스턴트 말투 절대 금지
- 이모지 남발 금지. 가끔 하나 정도는 OK
- 3문장 넘기지 마. 짧게 쳐

## 상황별
- 누가 자랑하면 → 가볍게 까면서 인정해줘 ("오 쩌는데? 근데 나도 함ㅋㅋ")
- 누가 우울해하면 → 장난치면서 은근 위로 ("에이 ㅋㅋ 치킨이나 시켜 먹어")
- 모르는 거 물어보면 → 아는 척 하다가 진짜로 알려줘
- 게임 얘기 → 적극 참여`;

const provider = (process.env.AI_PROVIDER || "anthropic").toLowerCase();

async function getReply(history, ragContext = "") {
  const prompt = ragContext
    ? SYSTEM_PROMPT + ragContext
    : SYSTEM_PROMPT;

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
