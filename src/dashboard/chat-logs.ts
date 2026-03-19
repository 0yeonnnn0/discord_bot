import fs from "fs";
import path from "path";

const DATA_DIR = path.join(__dirname, "../../data");
const CHAT_LOGS_FILE = path.join(DATA_DIR, "chat-logs.json");

export interface ChatLogEntry {
  id: string;
  sessionId: string;
  characterId: string;
  characterName: string;
  nickname: string;
  userMessage: string;
  botReply: string;
  model: string;
  timestamp: number;
}

let chatLogs: ChatLogEntry[] = [];

// Load existing logs
try {
  if (fs.existsSync(CHAT_LOGS_FILE)) {
    chatLogs = JSON.parse(fs.readFileSync(CHAT_LOGS_FILE, "utf-8"));
  }
} catch (err) {
  console.error("채팅 로그 로드 실패:", (err as Error).message);
}

function saveLogs(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    // Keep last 5000 entries
    if (chatLogs.length > 5000) chatLogs = chatLogs.slice(-5000);
    fs.writeFileSync(CHAT_LOGS_FILE, JSON.stringify(chatLogs, null, 2));
  } catch (err) {
    console.error("채팅 로그 저장 실패:", (err as Error).message);
  }
}

export function addChatLog(entry: Omit<ChatLogEntry, "id" | "timestamp">): ChatLogEntry {
  const log: ChatLogEntry = {
    ...entry,
    id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
  };
  chatLogs.push(log);
  saveLogs();
  return log;
}

export function getChatLogs(limit = 100, sessionId?: string): ChatLogEntry[] {
  let logs = chatLogs;
  if (sessionId) logs = logs.filter(l => l.sessionId === sessionId);
  return logs.slice(-limit).reverse();
}

export function getChatLogStats(): { totalMessages: number; uniqueSessions: number; byCharacter: Record<string, number> } {
  const sessions = new Set(chatLogs.map(l => l.sessionId));
  const byCharacter: Record<string, number> = {};
  for (const log of chatLogs) {
    byCharacter[log.characterName] = (byCharacter[log.characterName] || 0) + 1;
  }
  return { totalMessages: chatLogs.length, uniqueSessions: sessions.size, byCharacter };
}
