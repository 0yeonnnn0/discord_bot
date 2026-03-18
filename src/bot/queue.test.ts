import { describe, it, expect } from "vitest";
import { enqueue, canUserRequest, markUserRequest, getQueueStats } from "./queue";

describe("queue", () => {
  it("should process tasks", async () => {
    const result = await enqueue(async () => "hello");
    expect(result).toBe("hello");
  });

  it("should return queue stats", () => {
    const stats = getQueueStats();
    expect(stats.maxConcurrent).toBe(3);
    expect(stats.activeCount).toBeTypeOf("number");
    expect(stats.queueLength).toBeTypeOf("number");
  });

  describe("user cooldown", () => {
    it("should allow first request", () => {
      expect(canUserRequest("new-user-123")).toBe(true);
    });

    it("should block after marking", () => {
      markUserRequest("cooldown-test");
      expect(canUserRequest("cooldown-test")).toBe(false);
    });
  });
});
