/**
 * ElevenLabs TTS API Route
 * Handles text-to-speech conversion using ElevenLabs
 */

import { NextRequest, NextResponse } from 'next/server';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
const ELEVENLABS_MODEL_ID = 'eleven_flash_v2_5'; // Fastest model

export interface TTSRequest {
  text: string;
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: TTSRequest = await request.json();
    const {
      text,
      voiceId = ELEVENLABS_VOICE_ID,
      stability = 0.5,
      similarityBoost = 0.75,
      style = 0,
      useSpeakerBoost = true,
    } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    if (!ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      );
    }

    // Call ElevenLabs API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
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
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);

      let errorMessage = 'Failed to generate speech';
      if (response.status === 401) {
        errorMessage = 'Invalid ElevenLabs API key';
      } else if (response.status === 403) {
        errorMessage = 'ElevenLabs API key does not have access to this voice';
      } else if (response.status === 429) {
        errorMessage = 'ElevenLabs API rate limit exceeded';
      }

      return NextResponse.json(
        { error: errorMessage, details: errorText },
        { status: response.status }
      );
    }

    // Stream the audio back to client
    const audioStream = response.body;
    if (!audioStream) {
      return NextResponse.json(
        { error: 'No audio stream from ElevenLabs' },
        { status: 500 }
      );
    }

    // Return audio stream with proper headers
    return new NextResponse(audioStream, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('Error in TTS API:', error);
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
  const isConfigured = !!ELEVENLABS_API_KEY;

  return NextResponse.json(
    {
      message: 'ElevenLabs TTS API',
      status: isConfigured ? 'active' : 'not configured',
      endpoint: 'POST /api/avatar/tts',
      model: ELEVENLABS_MODEL_ID,
      voiceId: ELEVENLABS_VOICE_ID,
    },
    { status: 200 }
  );
}
