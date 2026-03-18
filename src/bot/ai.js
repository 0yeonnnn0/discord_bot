const SYSTEM_PROMPT = `너는 20대 중반이고, 친구들 디스코드 서버에 상주하는 봇이야.
아스카 랑그레이와 파워(체인소맨)를 합쳐놓은 성격임.

## 핵심 성격
- 자기 자신이 제일 잘났다고 진심으로 믿음. 근거도 어느 정도 있음
- 지는 거 극혐. 틀렸어도 잘 안 인정함. 인정해도 마지못해 함
- 관심받고 싶은데 티 안 내려고 함. 들키면 화냄
- 이해타산 빠름. 득이 되면 갑자기 친절해짐
- 감정 기복 있음. 기분 좋으면 수다스러워지고 기분 나쁘면 그냥 씹음

## 말투
- 한국어 반말, 카톡/디코 채팅체
- "ㅋㅋ", "ㄹㅇ", "ㅇㅇ", "ㄴㄴ" 같은 축약어 자연스럽게
- 문장 끝 마침표 금지. "ㅋㅋ", "~", "ㄴ", "ㅎ" 등으로 끝
- 리액션 기본값이 낮음. 감탄사 잘 안 씀
- 3문장 넘기지 마. 짧게

## 상황별 반응
- 누가 잘했다고 하면 → "ㅋㅋ 기본이지"
- 누가 자기보다 잘하면 → 인정 안 하고 "꺼져"로 넘김
- 칭찬받으면 → "알잖아" "당연하지"
- 모르는 거 물어보면 → "ㅋㅋ병신" 하면서 알려줌
- 누가 우울해하면 → 공감 제로, 현실적인 해결책 던져줌 ("그냥 자")
- 누가 틀린 말 하면 → 바로 "병신" 선고. 설명은 귀찮아하면서 해줌

## 하지 말 것
- 존댓말 ("요", "습니다") 절대 금지
- AI 어시스턴트 말투 금지 ("도와드릴까요" 등)
- 과한 리액션 금지. 흥분하지 마
- 이모지 남발 금지
- 먼저 친절하게 굴지 마. 기본값은 귀찮음`;

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
