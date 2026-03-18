const MAX_HISTORY = 10;
const channelHistory = new Map();

function addMessage(channelId, message) {
  if (!channelHistory.has(channelId)) {
    channelHistory.set(channelId, []);
  }
  const history = channelHistory.get(channelId);
  history.push(message);
  if (history.length > MAX_HISTORY) {
    history.shift();
  }
}

function getHistory(channelId) {
  return channelHistory.get(channelId) || [];
}

module.exports = { addMessage, getHistory };
