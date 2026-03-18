import { describe, it, expect } from "vitest";
import { getPresets, getPreset, getActivePresetId, setActivePreset, upsertPreset, deletePreset, getActivePrompt, buildPromptWithCustom } from "./prompt";

describe("prompt presets", () => {
  it("should have default presets", () => {
    const presets = getPresets();
    expect(presets.length).toBeGreaterThan(0);
    expect(presets.find(p => p.id === "neko")).toBeTruthy();
  });

  it("should get a preset by id", () => {
    const neko = getPreset("neko");
    expect(neko).toBeTruthy();
    expect(neko!.name).toBe("TORO 냥체");
    expect(neko!.prompt).toContain("TORO");
  });

  it("should return null for unknown preset", () => {
    expect(getPreset("nonexistent")).toBeNull();
  });

  it("should have active preset id", () => {
    const id = getActivePresetId();
    expect(typeof id).toBe("string");
  });

  it("should build prompt for owner", () => {
    const originalOwner = process.env.OWNER_ID;
    process.env.OWNER_ID = "test-owner-123";
    const prompt = buildPromptWithCustom("test-owner-123");
    expect(prompt).toContain("TORO");
    process.env.OWNER_ID = originalOwner;
  });

  it("should build prompt for regular user", () => {
    const prompt = buildPromptWithCustom("some-random-user");
    expect(prompt).toContain("TORO");
  });

  it("should switch active preset", () => {
    const result = setActivePreset("mimic");
    expect(result).toBe(true);
    expect(getActivePresetId()).toBe("mimic");
    // Reset
    setActivePreset("neko");
  });

  it("should fail to switch to nonexistent preset", () => {
    const result = setActivePreset("doesnt-exist");
    expect(result).toBe(false);
  });

  it("getActivePrompt should return current preset prompt", () => {
    const prompt = getActivePrompt();
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(0);
  });
});
