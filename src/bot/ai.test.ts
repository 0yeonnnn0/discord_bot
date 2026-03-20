import { describe, it, expect, beforeEach } from "vitest";
import { state } from "../shared/state";
import { callAI } from "./ai";

const history = [{ role: "user" as const, content: "hello" }];

beforeEach(() => {
  // Clear keys so missing-key tests work
  state.config.googleApiKey = "";
  state.config.openaiApiKey = "";
  state.config.anthropicApiKey = "";
});

describe("callAI — error handling", () => {
  it("throws clear error when google API key is missing", async () => {
    state.config.aiProvider = "google";
    state.config.googleApiKey = "";
    const saved = process.env.GOOGLE_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    await expect(callAI(history, "prompt")).rejects.toThrow("Google API 키가 설정되지 않았습니다");
    if (saved) process.env.GOOGLE_API_KEY = saved;
  });

  it("throws clear error when openai API key is missing", async () => {
    state.config.aiProvider = "openai";
    state.config.openaiApiKey = "";
    const saved = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    await expect(callAI(history, "prompt")).rejects.toThrow("OpenAI API 키가 설정되지 않았습니다");
    if (saved) process.env.OPENAI_API_KEY = saved;
  });

  it("throws clear error when anthropic API key is missing", async () => {
    state.config.aiProvider = "anthropic";
    state.config.anthropicApiKey = "";
    const saved = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    await expect(callAI(history, "prompt")).rejects.toThrow("Anthropic API 키가 설정되지 않았습니다");
    if (saved) process.env.ANTHROPIC_API_KEY = saved;
  });

  it("throws on unsupported provider", async () => {
    state.config.aiProvider = "unsupported";
    await expect(callAI(history, "prompt")).rejects.toThrow("지원하지 않는 AI_PROVIDER");
  });

  it("error messages include settings guidance", async () => {
    state.config.aiProvider = "google";
    state.config.googleApiKey = "";
    const saved = process.env.GOOGLE_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    await expect(callAI(history, "prompt")).rejects.toThrow("Settings → API Keys");
    if (saved) process.env.GOOGLE_API_KEY = saved;
  });
});
