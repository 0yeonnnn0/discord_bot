import { GoogleGenerativeAI } from "@google/generative-ai";
import { AttachmentBuilder } from "discord.js";

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
  }
  return genAI;
}

export async function generateImage(prompt: string): Promise<AttachmentBuilder | null> {
  const model = getGenAI().getGenerativeModel({
    model: "gemini-2.5-flash-preview-image-generation",
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    } as any,
  });

  const result = await model.generateContent(prompt);
  const response = result.response;

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if ((part as any).inlineData && (part as any).inlineData.mimeType?.startsWith("image/")) {
      const imageData = (part as any).inlineData.data;
      const buffer = Buffer.from(imageData, "base64");
      return new AttachmentBuilder(buffer, { name: "toro-art.png" });
    }
  }

  return null;
}
