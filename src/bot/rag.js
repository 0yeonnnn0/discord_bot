const path = require("path");
const { LocalIndex } = require("vectra");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const DATA_DIR = path.join(__dirname, "../../data/vectors");
const index = new LocalIndex(DATA_DIR);

let genAI = null;

function getGenAI() {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  }
  return genAI;
}

// 임베딩 생성
async function getEmbedding(text) {
  const model = getGenAI().getGenerativeModel({ model: "gemini-embedding-001" });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

// 인덱스 초기화
async function initIndex() {
  if (!(await index.isIndexCreated())) {
    await index.createIndex();
    console.log("벡터 인덱스 생성 완료");
  }
  console.log("RAG 시스템 초기화 완료");
}

// 대화 묶음 저장
async function storeConversation({ channel, messages, timestamp }) {
  const text = messages.map((m) => m.content).join("\n");

  try {
    const vector = await getEmbedding(text);
    await index.insertItem({
      vector,
      metadata: {
        channel,
        timestamp,
        text,
        messageCount: messages.length,
      },
    });
  } catch (err) {
    console.error("벡터 저장 실패:", err.message);
  }
}

// 관련 과거 대화 검색
async function searchRelevant(query, topK = 3) {
  try {
    if (!(await index.isIndexCreated())) return [];

    const vector = await getEmbedding(query);
    const results = await index.queryItems(vector, topK);

    // 유사도 0.5 이상만
    return results
      .filter((r) => r.score > 0.5)
      .map((r) => ({
        text: r.item.metadata.text,
        channel: r.item.metadata.channel,
        timestamp: r.item.metadata.timestamp,
        score: r.score,
      }));
  } catch (err) {
    console.error("벡터 검색 실패:", err.message);
    return [];
  }
}

// 검색 결과를 프롬프트용 텍스트로 변환
function formatContext(results) {
  if (results.length === 0) return "";

  const lines = results.map((r) => {
    const date = new Date(r.timestamp).toLocaleDateString("ko-KR");
    return `[${date} #${r.channel}]\n${r.text}`;
  });

  return `\n\n[관련 과거 대화]\n${lines.join("\n\n")}`;
}

module.exports = { initIndex, storeConversation, searchRelevant, formatContext };
