import { GoogleGenAI } from "@google/genai";
import { AttachmentBuilder } from "discord.js";

let ai: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!ai) {
    ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || "" });
  }
  return ai;
}

export async function generateImage(prompt: string): Promise<AttachmentBuilder | null> {
  const response = await getAI().models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: prompt,
    config: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData && part.inlineData.mimeType?.startsWith("image/")) {
      const buffer = Buffer.from(part.inlineData.data!, "base64");
      return new AttachmentBuilder(buffer, { name: "toro-art.png" });
    }
  }

  return null;
}
