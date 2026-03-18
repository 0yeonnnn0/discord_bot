const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../../data");
const STATE_FILE = path.join(DATA_DIR, "state.json");
const MAX_LOGS = 100;
const SAVE_INTERVAL = 30000; // 30초마다 저장

// 저장된 데이터 불러오기
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
      console.log("저장된 상태 복원 완료");
      return data;
    }
  } catch (err) {
    console.error("상태 복원 실패:", err.message);
  }
  return null;
}

const saved = loadState();

const state = {
  config: {
    replyChance: saved?.config?.replyChance ?? (parseFloat(process.env.REPLY_CHANCE) || 0.08),
  },
  stats: {
    messagesProcessed: saved?.stats?.messagesProcessed ?? 0,
    repliesSent: saved?.stats?.repliesSent ?? 0,
    startedAt: Date.now(),
  },
  logs: saved?.logs ?? [],
  userStats: saved?.userStats ?? {},
  keywords: saved?.keywords ?? {},
};

// 디스크에 저장
function saveState() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify({
      config: state.config,
      stats: { messagesProcessed: state.stats.messagesProcessed, repliesSent: state.stats.repliesSent },
      logs: state.logs,
      userStats: state.userStats,
      keywords: state.keywords,
    }));
  } catch (err) {
    console.error("상태 저장 실패:", err.message);
  }
}

// 주기적 저장
setInterval(saveState, SAVE_INTERVAL);

// 프로세스 종료 시 저장
process.on("SIGTERM", () => { saveState(); process.exit(0); });
process.on("SIGINT", () => { saveState(); process.exit(0); });

function addLog(entry) {
  state.logs.push({
    timestamp: Date.now(),
    ...entry,
  });
  if (state.logs.length > MAX_LOGS) {
    state.logs.shift();
  }
}

function trackUser(userId, displayName, botReplied) {
  if (!state.userStats[userId]) {
    state.userStats[userId] = {
      displayName,
      messages: 0,
      gotReplies: 0,
    };
  }
  const user = state.userStats[userId];
  user.displayName = displayName;
  user.messages++;
  if (botReplied) user.gotReplies++;
}

const STOP_WORDS = new Set([
  "이", "그", "저", "것", "수", "등", "더", "좀", "잘", "못",
  "안", "걍", "ㅋㅋ", "ㅎㅎ", "ㅇㅇ", "ㄴㄴ", "ㄹㅇ", "the",
  "is", "a", "an", "and", "or", "to", "in", "of", "for", "it",
  "나", "너", "우리", "얘", "걔", "뭐", "왜", "어", "아", "응",
  "네", "예", "진짜", "근데", "그래", "했어", "했는데", "하는",
]);

function trackKeywords(content) {
  const words = content
    .replace(/[^\w가-힣]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));

  for (const word of words) {
    state.keywords[word] = (state.keywords[word] || 0) + 1;
  }
}

function getTopKeywords(n = 20) {
  return Object.entries(state.keywords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([word, count]) => ({ word, count }));
}

function getUserStatsRanked() {
  return Object.entries(state.userStats)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.messages - a.messages);
}

module.exports = {
  state,
  addLog,
  trackUser,
  trackKeywords,
  getTopKeywords,
  getUserStatsRanked,
  saveState,
};
