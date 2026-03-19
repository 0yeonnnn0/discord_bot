import { GoogleGenAI } from "@google/genai";
import { AttachmentBuilder } from "discord.js";
import wav from "wav";
import { Readable } from "stream";

let ai: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!ai) {
    ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || "" });
  }
  return ai;
}

// Korean-friendly voices
export const VOICES = {
  kore: "Kore",        // 여성, 차분
  aoede: "Aoede",      // 여성, 밝음
  puck: "Puck",        // 남성, 활발
  charon: "Charon",    // 남성, 낮음
  fenrir: "Fenrir",    // 남성, 부드러움
  leda: "Leda",        // 여성, 따뜻
} as const;

export type VoiceName = keyof typeof VOICES;

function pcmToWav(pcmData: Buffer, sampleRate = 24000, channels = 1, bitDepth = 16): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const writer = new wav.Writer({
      channels,
      sampleRate,
      bitDepth,
    });

    writer.on("data", (chunk: Buffer) => chunks.push(chunk));
    writer.on("end", () => resolve(Buffer.concat(chunks)));
    writer.on("error", reject);

    const readable = new Readable();
    readable.push(pcmData);
    readable.push(null);
    readable.pipe(writer);
  });
}

export async function generateSpeech(
  text: string,
  voice: VoiceName = "kore"
): Promise<AttachmentBuilder | null> {
  const voiceName = VOICES[voice] || VOICES.kore;

  const response = await getAI().models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  });

  const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!data) return null;

  const pcmBuffer = Buffer.from(data, "base64");
  const wavBuffer = await pcmToWav(pcmBuffer);

  return new AttachmentBuilder(wavBuffer, { name: "toro-voice.wav" });
}
