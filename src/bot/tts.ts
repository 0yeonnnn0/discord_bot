import { GoogleGenAI, Modality } from "@google/genai";
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

export const VOICES = {
  kore: "Kore",
  aoede: "Aoede",
  puck: "Puck",
  charon: "Charon",
  fenrir: "Fenrir",
  leda: "Leda",
} as const;

export type VoiceName = keyof typeof VOICES;

function pcmToWav(pcmData: Buffer, sampleRate = 24000, channels = 1, bitDepth = 16): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const writer = new wav.Writer({ channels, sampleRate, bitDepth });
    writer.on("data", (chunk: Buffer) => chunks.push(chunk));
    writer.on("end", () => resolve(Buffer.concat(chunks)));
    writer.on("error", reject);
    const readable = new Readable();
    readable.push(pcmData);
    readable.push(null);
    readable.pipe(writer);
  });
}

// Native Audio Dialog via Live API — more expressive than TTS
export async function generateSpeech(
  text: string,
  voice: VoiceName = "kore"
): Promise<AttachmentBuilder | null> {
  const voiceName = VOICES[voice] || VOICES.kore;

  // Try native audio first, fallback to TTS
  try {
    return await generateNativeAudio(text, voiceName);
  } catch (err) {
    console.warn(`[TTS] Native audio 실패, TTS fallback: ${(err as Error).message?.slice(0, 80)}`);
    return await generateTTS(text, voiceName);
  }
}

// Method 1: Live API Native Audio (감정, 톤 자연스러움)
async function generateNativeAudio(text: string, voiceName: string): Promise<AttachmentBuilder | null> {
  const audioChunks: string[] = [];

  const result = await new Promise<Buffer | null>((resolve, reject) => {
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) { resolved = true; reject(new Error("Live API timeout")); }
    }, 15000);

    getAI().live.connect({
      model: "gemini-2.5-flash-native-audio-preview-12-2025",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
      callbacks: {
        onopen() {
          // Session is available as `this` won't work, so we use the promise-returned session
        },
        onmessage(message: any) {
          if (message.serverContent?.modelTurn?.parts) {
            for (const part of message.serverContent.modelTurn.parts) {
              if (part.inlineData?.data) {
                audioChunks.push(part.inlineData.data);
              }
            }
          }
          if (message.serverContent?.turnComplete) {
            clearTimeout(timeout);
            if (resolved) return;
            resolved = true;
            if (audioChunks.length === 0) {
              resolve(null);
            } else {
              resolve(Buffer.concat(audioChunks.map(c => Buffer.from(c, "base64"))));
            }
          }
        },
        onerror(err: any) {
          clearTimeout(timeout);
          if (!resolved) { resolved = true; reject(err); }
        },
      },
    }).then((session) => {
      session.sendClientContent({
        turns: [{ role: "user", parts: [{ text }] }],
        turnComplete: true,
      });
    }).catch((err) => {
      clearTimeout(timeout);
      if (!resolved) { resolved = true; reject(err); }
    });
  });

  if (!result) return null;
  const wavBuffer = await pcmToWav(result);
  return new AttachmentBuilder(wavBuffer, { name: "toro-voice.wav" });
}

// Method 2: TTS Fallback (단순 텍스트 읽기)
async function generateTTS(text: string, voiceName: string): Promise<AttachmentBuilder | null> {
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
