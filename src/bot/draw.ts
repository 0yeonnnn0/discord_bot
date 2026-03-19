import { GoogleGenAI } from "@google/genai";
import { AttachmentBuilder } from "discord.js";

let ai: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!ai) {
    ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || "" });
  }
  return ai;
}

export type ImagenModel = "fast" | "standard" | "ultra";

const MODEL_MAP: Record<ImagenModel, string> = {
  fast: "imagen-4.0-fast-generate-001",
  standard: "imagen-4.0-generate-001",
  ultra: "imagen-4.0-ultra-generate-001",
};

const FALLBACK_ORDER: ImagenModel[] = ["fast", "standard", "ultra"];

export async function generateImage(
  prompt: string,
  quality: ImagenModel = "fast"
): Promise<{ attachment: AttachmentBuilder; usedModel: ImagenModel } | null> {
  // Build try order: start from requested quality, then try the rest
  const startIdx = FALLBACK_ORDER.indexOf(quality);
  const tryOrder = FALLBACK_ORDER.slice(startIdx);

  for (const q of tryOrder) {
    try {
      const result = await tryGenerate(prompt, q);
      if (result) return { attachment: result, usedModel: q };
    } catch (err) {
      const msg = (err as Error).message || "";
      const isRetryable = msg.includes("429") || msg.includes("quota") || msg.includes("limit") || msg.includes("503");
      if (!isRetryable || q === tryOrder[tryOrder.length - 1]) throw err;
      console.warn(`[Imagen Fallback] ${MODEL_MAP[q]} 실패, ${MODEL_MAP[tryOrder[tryOrder.indexOf(q) + 1]]}로 재시도`);
    }
  }

  return null;
}

async function tryGenerate(prompt: string, quality: ImagenModel): Promise<AttachmentBuilder | null> {
  const model = MODEL_MAP[quality];

  const response = await getAI().models.generateImages({
    model,
    prompt,
    config: {
      numberOfImages: 1,
    },
  });

  const generated = response.generatedImages?.[0];
  if (generated?.image?.imageBytes) {
    const buffer = Buffer.from(generated.image.imageBytes, "base64");
    return new AttachmentBuilder(buffer, { name: "toro-art.png" });
  }

  return null;
}
