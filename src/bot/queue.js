// 간단한 메시지 처리 큐
// - 동시 API 호출 수 제한
// - 유저별 쿨다운
// - 실패 시 재시도 없음 (Discord 봇은 재시도보다 스킵이 나음)

const MAX_CONCURRENT = 3; // 동시 최대 API 호출 수
const USER_COOLDOWN = 3000; // 유저당 쿨다운 (ms)
const QUEUE_TIMEOUT = 15000; // 큐 대기 최대 시간 (ms)

let activeCount = 0;
const queue = [];
const userLastReply = new Map();

function canUserRequest(userId) {
  const last = userLastReply.get(userId);
  if (!last) return true;
  return Date.now() - last >= USER_COOLDOWN;
}

function markUserRequest(userId) {
  userLastReply.set(userId, Date.now());
}

function enqueue(task) {
  return new Promise((resolve, reject) => {
    const entry = {
      task,
      resolve,
      reject,
      addedAt: Date.now(),
    };

    queue.push(entry);
    processQueue();
  });
}

async function processQueue() {
  if (activeCount >= MAX_CONCURRENT || queue.length === 0) return;

  const entry = queue.shift();

  // 큐에서 너무 오래 대기한 건 스킵
  if (Date.now() - entry.addedAt > QUEUE_TIMEOUT) {
    entry.resolve(null); // null = 스킵됨
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

function getQueueStats() {
  return {
    activeCount,
    queueLength: queue.length,
    maxConcurrent: MAX_CONCURRENT,
  };
}

module.exports = { enqueue, canUserRequest, markUserRequest, getQueueStats };
