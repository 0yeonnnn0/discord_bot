import { describe, it, expect } from "vitest";
import { maskKey } from "./keys";

describe("maskKey", () => {
  it("masks long keys showing first 4 and last 3 chars", () => {
    expect(maskKey("AIzaSyDLMgGfiD9apQzcedT3")).toBe("AIza...dT3");
  });

  it("masks exactly 8-char key", () => {
    expect(maskKey("12345678")).toBe("1234...678");
  });

  it("returns **** for short keys", () => {
    expect(maskKey("short")).toBe("****");
    expect(maskKey("1234567")).toBe("****");
  });

  it("returns empty string for empty/undefined", () => {
    expect(maskKey("")).toBe("");
    expect(maskKey(undefined)).toBe("");
  });
});
