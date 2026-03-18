export interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

const MAX_HISTORY = 10;
const channelHistory = new Map<string, HistoryMessage[]>();

export function addMessage(channelId: string, message: HistoryMessage): void {
  if (!channelHistory.has(channelId)) {
    channelHistory.set(channelId, []);
  }
  const history = channelHistory.get(channelId)!;
  history.push(message);
  if (history.length > MAX_HISTORY) {
    history.shift();
  }
}

export function getHistory(channelId: string): HistoryMessage[] {
  return channelHistory.get(channelId) || [];
}
