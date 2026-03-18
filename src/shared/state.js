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

module.exports = { state, addLog };
