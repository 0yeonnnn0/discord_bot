const URL_REGEX = /https?:\/\/[^\s<>)"']+/g;
const MAX_LENGTH = 2000;
const TIMEOUT_MS = 5000;

/** Extract URLs from text */
export function extractUrls(text: string): string[] {
  return [...(text.match(URL_REGEX) || [])];
}

/** Strip HTML tags and collapse whitespace */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Fetch a URL and return plain text content (truncated) */
async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DiscordBot/1.0)" },
    });
    clearTimeout(timer);

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      return null; // Skip binary, images, etc.
    }

    const html = await res.text();
    const text = htmlToText(html);
    return text.length > MAX_LENGTH ? text.slice(0, MAX_LENGTH) + "..." : text;
  } catch {
    return null;
  }
}

/** Fetch all URLs in text and return combined context string */
export async function fetchUrlContext(text: string): Promise<string> {
  const urls = extractUrls(text);
  if (urls.length === 0) return "";

  const results = await Promise.all(
    urls.slice(0, 3).map(async (url) => {
      const content = await fetchPage(url);
      return content ? `<web_content url="${url}">\n${content}\n</web_content>` : null;
    })
  );

  const valid = results.filter(Boolean);
  if (valid.length === 0) return "";

  return "\n" + valid.join("\n");
}
