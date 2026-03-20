import { describe, it, expect, beforeEach } from "vitest";
import { addMessage, getHistory } from "./history";

describe("history", () => {
  it("should store messages per channel", () => {
    addMessage("ch1", { role: "user", content: "hello" });
    addMessage("ch2", { role: "user", content: "world" });

    expect(getHistory("ch1")).toHaveLength(1);
    expect(getHistory("ch2")).toHaveLength(1);
    expect(getHistory("ch1")[0].content).toBe("hello");
  });

  it("should cap at 30 messages", () => {
    for (let i = 0; i < 35; i++) {
      addMessage("ch-cap", { role: "user", content: `msg${i}` });
    }
    const h = getHistory("ch-cap");
    expect(h).toHaveLength(30);
    expect(h[0].content).toBe("msg5");
  });

  it("should return empty for unknown channel", () => {
    expect(getHistory("nonexistent")).toEqual([]);
  });
});
