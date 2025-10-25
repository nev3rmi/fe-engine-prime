/**
 * Hugging Face MMS-TTS API Route
 * Handles text-to-speech conversion using Facebook's MMS-TTS model
 * Supports Vietnamese and 1,100+ other languages
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const HF_MODEL = 'facebook/mms-tts';
const HF_API_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`;

// Language code mapping (ISO 639-3 to MMS-TTS codes)
const LANGUAGE_CODES: Record<string, string> = {
  'vi': 'vie', // Vietnamese
  'en': 'eng', // English
  'zh': 'cmn', // Chinese (Mandarin)
  'ja': 'jpn', // Japanese
  'ko': 'kor', // Korean
  'th': 'tha', // Thai
  'id': 'ind', // Indonesian
  'ms': 'msa', // Malay
};

export interface TTSRequest {
  text: string;
  language?: string; // ISO 639-1 code (e.g., 'vi', 'en')
}

export async function POST(request: NextRequest) {
  try {
    const body: TTSRequest = await request.json();
    const { text, language = 'vi' } = body; // Default to Vietnamese

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    if (!HF_API_KEY || HF_API_KEY === 'hf_placeholder_get_from_huggingface_settings') {
      return NextResponse.json(
        {
          error: 'Hugging Face API key not configured',
          instructions: 'Get free API key from https://huggingface.co/settings/tokens'
        },
        { status: 500 }
      );
    }

    // Get language code for MMS-TTS
    const languageCode = LANGUAGE_CODES[language] || 'vie';

    console.log(`[MMS-TTS] Generating speech for language: ${language} (${languageCode})`);
    console.log(`[MMS-TTS] Text length: ${text.length} characters`);

    // Call Hugging Face Inference API
    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: text,
        parameters: {
          language: languageCode,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Hugging Face API error:', response.status, errorText);

      let errorMessage = 'Failed to generate speech';

      if (response.status === 401) {
        errorMessage = 'Invalid Hugging Face API key';
      } else if (response.status === 403) {
        errorMessage = 'Hugging Face API key does not have access to this model';
      } else if (response.status === 429) {
        errorMessage = 'Hugging Face API rate limit exceeded';
      } else if (response.status === 503) {
        errorMessage = 'Model is loading, please try again in a few seconds';
      }

      return NextResponse.json(
        { error: errorMessage, details: errorText },
        { status: response.status }
      );
    }

    // Get audio stream from response
    const audioBuffer = await response.arrayBuffer();

    if (!audioBuffer || audioBuffer.byteLength === 0) {
      return NextResponse.json(
        { error: 'No audio generated from Hugging Face' },
        { status: 500 }
      );
    }

    console.log(`[MMS-TTS] Success! Audio size: ${audioBuffer.byteLength} bytes`);

    // Return audio with proper headers
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('Error in MMS-TTS API:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const isConfigured = !!HF_API_KEY && HF_API_KEY !== 'hf_placeholder_get_from_huggingface_settings';

  return NextResponse.json(
    {
      message: 'Hugging Face MMS-TTS API',
      status: isConfigured ? 'active' : 'not configured',
      endpoint: 'POST /api/avatar/tts-hf',
      model: HF_MODEL,
      supportedLanguages: Object.keys(LANGUAGE_CODES),
      instructions: isConfigured
        ? 'API key configured'
        : 'Get free API key from https://huggingface.co/settings/tokens',
    },
    { status: 200 }
  );
}
