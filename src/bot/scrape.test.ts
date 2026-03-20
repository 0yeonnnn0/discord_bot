import { describe, it, expect } from "vitest";
import { extractUrls } from "./scrape";

describe("extractUrls", () => {
  it("extracts URLs from text", () => {
    const urls = extractUrls("check this out https://example.com and http://foo.bar/baz");
    expect(urls).toEqual(["https://example.com", "http://foo.bar/baz"]);
  });

  it("returns empty array when no URLs", () => {
    expect(extractUrls("no links here")).toEqual([]);
  });

  it("handles URLs with query params", () => {
    const urls = extractUrls("https://example.com/page?id=123&foo=bar");
    expect(urls).toEqual(["https://example.com/page?id=123&foo=bar"]);
  });

  it("ignores non-http protocols", () => {
    expect(extractUrls("ftp://files.com ws://socket.io")).toEqual([]);
  });
});
