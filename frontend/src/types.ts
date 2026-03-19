export interface BotStatus {
  online: boolean;
  uptime: number;
  guilds: number;
  stats: {
    messagesProcessed: number;
    repliesSent: number;
    startedAt: number;
  };
  queue: {
    activeCount: number;
    queueLength: number;
    maxConcurrent: number;
  };
  config: {
    replyChance: number;
    aiProvider: string;
    model: string;
  };
}

export interface UserStat {
  id: string;
  displayName: string;
  messages: number;
  gotReplies: number;
}

export interface Keyword {
  word: string;
  count: number;
}

export interface LogEntry {
  timestamp: number;
  guild?: string;
  channel: string;
  author: string;
  content: string;
  botReplied: boolean;
  triggerReason: "mention" | "random" | null;
  botReply: string | null;
  responseTime: number | null;
  ragHits: number;
  error: string | null;
  model: string | null;
}

export interface EventEntry {
  timestamp: number;
  type: string;
  detail: string;
}

export interface ErrorEntry {
  timestamp: number;
  type: string;
  message: string;
  detail: string;
}

export interface PresetInfo {
  id: string;
  name: string;
  description: string;
  active: boolean;
}

export interface Preset extends PresetInfo {
  prompt: string;
  ownerSuffix: string;
  userSuffix: string;
}

export interface RagStats {
  vectorCount: number;
  indexCreated: boolean;
}

export interface RagVector {
  id: string;
  channel: string;
  timestamp: number;
  text: string;
  messageCount: number;
  hits: number;
  lastHit: number | null;
}

export interface SearchResult {
  id: string;
  text: string;
  channel: string;
  timestamp: number;
  score: number;
}

export interface TimelineEntry {
  date: string;
  stored: number;
  hits: number;
}

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
