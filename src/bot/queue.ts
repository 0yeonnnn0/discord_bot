const MAX_CONCURRENT = 3;
const USER_COOLDOWN = 3000;
const QUEUE_TIMEOUT = 15000;

let activeCount = 0;

interface QueueEntry {
  task: () => Promise<string | null>;
  resolve: (value: string | null) => void;
  reject: (reason: unknown) => void;
  addedAt: number;
}

const queue: QueueEntry[] = [];
const userLastReply = new Map<string, number>();

export function canUserRequest(userId: string): boolean {
  const last = userLastReply.get(userId);
  if (!last) return true;
  return Date.now() - last >= USER_COOLDOWN;
}

export function markUserRequest(userId: string): void {
  userLastReply.set(userId, Date.now());
}

export function enqueue(task: () => Promise<string | null>): Promise<string | null> {
  return new Promise((resolve, reject) => {
    queue.push({ task, resolve, reject, addedAt: Date.now() });
    processQueue();
  });
}

async function processQueue(): Promise<void> {
  if (activeCount >= MAX_CONCURRENT || queue.length === 0) return;

  const entry = queue.shift()!;

  if (Date.now() - entry.addedAt > QUEUE_TIMEOUT) {
    entry.resolve(null);
    processQueue();
    return;
  }

  activeCount++;

  try {
    const result = await entry.task();
    entry.resolve(result);
  } catch (err) {
    entry.reject(err);
  } finally {
    activeCount--;
    processQueue();
  }
}

export function getQueueStats() {
  return {
    activeCount,
    queueLength: queue.length,
    maxConcurrent: MAX_CONCURRENT,
  };
}
