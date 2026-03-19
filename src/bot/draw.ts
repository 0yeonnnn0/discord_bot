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

export async function generateImage(
  prompt: string,
  quality: ImagenModel = "fast"
): Promise<AttachmentBuilder | null> {
  const model = MODEL_MAP[quality] || MODEL_MAP.fast;

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
