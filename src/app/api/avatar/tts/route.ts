/**
 * Multi-Provider TTS API Route
 * Primary: Azure Speech Service (free tier, Vietnamese support, native viseme data)
 * Fallback 1: Hugging Face MMS-TTS (free, but models not on Inference API)
 * Fallback 2: ElevenLabs (paid, high quality)
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
const ELEVENLABS_MODEL_ID = "eleven_flash_v2_5"; // Fastest model

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;

const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY;
const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION || "eastus";

export interface TTSRequest {
  text: string;
  language?: string; // 'vi' for Vietnamese, 'en' for English
  provider?: "auto" | "azure" | "huggingface" | "elevenlabs"; // Provider selection
  voiceId?: string;
  gender?: "male" | "female"; // For Azure voice selection
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

// Language-specific MMS-TTS models
const HF_MODELS: Record<string, string> = {
  vi: "facebook/mms-tts-vie", // Vietnamese
  en: "facebook/mms-tts-eng", // English
  zh: "facebook/mms-tts-cmn", // Chinese (Mandarin)
  ja: "facebook/mms-tts-jpn", // Japanese
  ko: "facebook/mms-tts-kor", // Korean
  th: "facebook/mms-tts-tha", // Thai
  id: "facebook/mms-tts-ind", // Indonesian
  ms: "facebook/mms-tts-msa", // Malay
};

// Azure Speech Service voices (neural)
const AZURE_VOICES: Record<string, { male: string; female: string; locale: string }> = {
  vi: { male: "vi-VN-NamMinhNeural", female: "vi-VN-HoaiMyNeural", locale: "vi-VN" },
  en: { male: "en-US-GuyNeural", female: "en-US-JennyNeural", locale: "en-US" },
  zh: { male: "zh-CN-YunxiNeural", female: "zh-CN-XiaoxiaoNeural", locale: "zh-CN" },
  ja: { male: "ja-JP-KeitaNeural", female: "ja-JP-NanamiNeural", locale: "ja-JP" },
  ko: { male: "ko-KR-InJoonNeural", female: "ko-KR-SunHiNeural", locale: "ko-KR" },
  th: { male: "th-TH-NiwatNeural", female: "th-TH-PremwadeeNeural", locale: "th-TH" },
  id: { male: "id-ID-ArdiNeural", female: "id-ID-GadisNeural", locale: "id-ID" },
  ms: { male: "ms-MY-OsmanNeural", female: "ms-MY-YasminNeural", locale: "ms-MY" },
};

/**
 * Try Azure Speech Service (free tier, Vietnamese support, native viseme data)
 */
async function tryAzureSpeechTTS(
  text: string,
  language = "vi",
  gender: "male" | "female" = "female"
): Promise<Response | null> {
  if (!AZURE_SPEECH_KEY || AZURE_SPEECH_KEY === "your-azure-speech-key-placeholder") {
    console.log("[TTS] Azure Speech not configured, skipping");
    return null;
  }

  // Get language-specific voice
  const voiceConfig = AZURE_VOICES[language];
  if (!voiceConfig) {
    console.log(`[TTS] No Azure voice for language: ${language}`);
    return null;
  }

  const voiceName = gender === "male" ? voiceConfig.male : voiceConfig.female;
  const locale = voiceConfig.locale;

  try {
    const apiUrl = `https://${AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;
    console.log(`[TTS] Trying Azure Speech ${voiceName} for lang=${language}`);

    // Build SSML request
    const ssml = `<speak version='1.0' xml:lang='${locale}'>
      <voice xml:lang='${locale}' name='${voiceName}'>
        ${text}
      </voice>
    </speak>`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": AZURE_SPEECH_KEY,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        "User-Agent": "FE-Engine-Prime",
      },
      body: ssml,
    });

    if (response.ok) {
      const audioBuffer = await response.arrayBuffer();
      if (audioBuffer && audioBuffer.byteLength > 0) {
        console.log(`[TTS] ✅ Azure Speech success (${audioBuffer.byteLength} bytes)`);
        return new Response(audioBuffer, {
          headers: {
            "Content-Type": "audio/mpeg",
            "X-TTS-Provider": "azure",
            "X-TTS-Voice": voiceName,
          },
        });
      }
    }

    const errorText = await response.text();
    console.log(
      `[TTS] ⚠️ Azure Speech failed: ${response.status} - ${errorText.substring(0, 100)}`
    );
    return null;
  } catch (error) {
    console.log("[TTS] ⚠️ Azure Speech error:", error);
    return null;
  }
}

/**
 * Try Hugging Face MMS-TTS (free, Vietnamese support)
 */
async function tryHuggingFaceTTS(text: string, language = "vi"): Promise<Response | null> {
  if (
    !HUGGINGFACE_API_KEY ||
    HUGGINGFACE_API_KEY === "hf_placeholder_get_from_huggingface_settings"
  ) {
    console.log("[TTS] Hugging Face not configured, skipping");
    return null;
  }

  // Get language-specific model
  const model = HF_MODELS[language];
  if (!model) {
    console.log(`[TTS] No Hugging Face model for language: ${language}`);
    return null;
  }

  try {
    const apiUrl = `https://api-inference.huggingface.co/models/${model}`;
    console.log(`[TTS] Trying Hugging Face ${model} for lang=${language}`);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: text,
      }),
    });

    if (response.ok) {
      const audioBuffer = await response.arrayBuffer();
      if (audioBuffer && audioBuffer.byteLength > 0) {
        console.log(`[TTS] ✅ Hugging Face success (${audioBuffer.byteLength} bytes)`);
        return new Response(audioBuffer, {
          headers: {
            "Content-Type": "audio/flac", // MMS-TTS returns FLAC
            "X-TTS-Provider": "huggingface",
            "X-TTS-Model": model,
          },
        });
      }
    }

    const errorText = await response.text();
    console.log(
      `[TTS] ⚠️ Hugging Face failed: ${response.status} - ${errorText.substring(0, 100)}`
    );
    return null;
  } catch (error) {
    console.log("[TTS] ⚠️ Hugging Face error:", error);
    return null;
  }
}

/**
 * Fallback to ElevenLabs (paid, high quality)
 */
async function tryElevenLabsTTS(
  text: string,
  voiceId: string,
  stability: number,
  similarityBoost: number,
  style: number,
  useSpeakerBoost: boolean
): Promise<Response | null> {
  if (!ELEVENLABS_API_KEY) {
    console.log("[TTS] ElevenLabs not configured");
    return null;
  }

  try {
    console.log("[TTS] Trying ElevenLabs");

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
      method: "POST",
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: ELEVENLABS_MODEL_ID,
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
          style,
          use_speaker_boost: useSpeakerBoost,
        },
      }),
    });

    if (response.ok && response.body) {
      console.log("[TTS] ✅ ElevenLabs success");
      return new Response(response.body, {
        headers: {
          "Content-Type": "audio/mpeg",
          "X-TTS-Provider": "elevenlabs",
        },
      });
    }

    const errorText = await response.text();
    console.log(`[TTS] ⚠️ ElevenLabs failed: ${response.status} - ${errorText}`);
    return null;
  } catch (error) {
    console.log("[TTS] ⚠️ ElevenLabs error:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: TTSRequest = await request.json();
    const {
      text,
      language = "vi", // Default to Vietnamese
      provider = "auto", // Auto-select provider
      gender = "female", // Default to female voice for Azure
      voiceId = ELEVENLABS_VOICE_ID,
      stability = 0.5,
      similarityBoost = 0.75,
      style = 0,
      useSpeakerBoost = true,
    } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    console.log(`[TTS] Request: ${text.length} chars, lang=${language}, provider=${provider}`);

    let result: Response | null = null;

    // Strategy 1: If specific provider requested, try only that one
    if (provider === "azure") {
      result = await tryAzureSpeechTTS(text, language, gender);
      if (!result) {
        return NextResponse.json({ error: "Azure Speech TTS failed" }, { status: 503 });
      }
    } else if (provider === "huggingface") {
      result = await tryHuggingFaceTTS(text, language);
      if (!result) {
        return NextResponse.json({ error: "Hugging Face TTS failed" }, { status: 503 });
      }
    } else if (provider === "elevenlabs") {
      result = await tryElevenLabsTTS(
        text,
        voiceId,
        stability,
        similarityBoost,
        style,
        useSpeakerBoost
      );
      if (!result) {
        return NextResponse.json({ error: "ElevenLabs TTS failed" }, { status: 503 });
      }
    }
    // Strategy 2: Auto mode - try Azure first, then Hugging Face, then ElevenLabs
    else {
      // Try Azure Speech first (free tier, best quality, native viseme support)
      result = await tryAzureSpeechTTS(text, language, gender);

      // Fallback to Hugging Face if Azure failed
      if (!result) {
        console.log("[TTS] Falling back to Hugging Face");
        result = await tryHuggingFaceTTS(text, language);
      }

      // Final fallback to ElevenLabs if both Azure and HF failed
      if (!result) {
        console.log("[TTS] Falling back to ElevenLabs");
        result = await tryElevenLabsTTS(
          text,
          voiceId,
          stability,
          similarityBoost,
          style,
          useSpeakerBoost
        );
      }

      // If all providers failed, return error
      if (!result) {
        return NextResponse.json(
          {
            error: "All TTS providers failed",
            details: "Azure, Hugging Face, and ElevenLabs are all unavailable",
          },
          { status: 503 }
        );
      }
    }

    // Return audio with caching headers
    const headers = new Headers(result.headers);
    headers.set("Cache-Control", "public, max-age=31536000");

    return new NextResponse(result.body, { headers });
  } catch (error) {
    console.error("Error in TTS API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const azureConfigured =
    !!AZURE_SPEECH_KEY && AZURE_SPEECH_KEY !== "your-azure-speech-key-placeholder";
  const hfConfigured =
    !!HUGGINGFACE_API_KEY && HUGGINGFACE_API_KEY !== "hf_placeholder_get_from_huggingface_settings";
  const elevenLabsConfigured = !!ELEVENLABS_API_KEY;

  return NextResponse.json(
    {
      message: "Multi-Provider TTS API",
      endpoint: "POST /api/avatar/tts",
      providers: {
        azure: {
          status: azureConfigured ? "active" : "not configured",
          voices: AZURE_VOICES,
          languages: Object.keys(AZURE_VOICES),
          region: AZURE_SPEECH_REGION,
          free: true,
          freeTier: "500K characters/month",
          features: ["Neural voices", "Viseme data", "SSML support"],
        },
        huggingface: {
          status: hfConfigured ? "active" : "not configured",
          models: HF_MODELS,
          languages: Object.keys(HF_MODELS),
          free: true,
          note: "Models not available on Inference API",
        },
        elevenlabs: {
          status: elevenLabsConfigured ? "active" : "not configured",
          model: ELEVENLABS_MODEL_ID,
          voiceId: ELEVENLABS_VOICE_ID,
          free: false,
        },
      },
      defaultLanguage: "vi",
      defaultProvider: "auto",
      fallbackChain: azureConfigured
        ? "Azure → Hugging Face → ElevenLabs"
        : hfConfigured
          ? "Hugging Face → ElevenLabs"
          : "ElevenLabs only",
      instructions: !azureConfigured
        ? "Add AZURE_SPEECH_KEY to .env.local (get from https://portal.azure.com)"
        : "Azure Speech configured",
    },
    { status: 200 }
  );
}
