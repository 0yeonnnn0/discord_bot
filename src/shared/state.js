const MAX_LOGS = 100;

const state = {
  config: {
    replyChance: parseFloat(process.env.REPLY_CHANCE) || 0.08,
  },
  stats: {
    messagesProcessed: 0,
    repliesSent: 0,
    startedAt: Date.now(),
  },
  logs: [],
  // 유저별 통계
  userStats: {},
  // 키워드 카운트
  keywords: {},
};

function addLog(entry) {
  state.logs.push({
    timestamp: Date.now(),
    ...entry,
  });
  if (state.logs.length > MAX_LOGS) {
    state.logs.shift();
  }
}

// 유저 통계 업데이트
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

// 키워드 추출 및 카운트
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

// 인기 키워드 상위 N개
function getTopKeywords(n = 20) {
  return Object.entries(state.keywords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([word, count]) => ({ word, count }));
}

// 유저 통계 정렬
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
};
