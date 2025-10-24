/**
 * Dify Chat API Route
 * Handles streaming chat responses from Dify AI
 */

import { NextRequest, NextResponse } from 'next/server';

const DIFY_API_URL = process.env.DIFY_API_URL || 'http://dify.toho.vn/v1';
const DIFY_API_KEY = process.env.DIFY_API_KEY || 'app-FXjGpAPSg6UmeXwc9kGOjJKZ';

export interface ChatRequest {
  message: string;
  conversationId?: string;
  userId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, conversationId, userId = 'default-user' } = body;

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Prepare Dify request
    const dififyRequest = {
      query: message,
      inputs: {},
      response_mode: 'streaming',
      user: userId,
      conversation_id: conversationId || undefined,
      auto_generate_name: true,
    };

    // Forward to Dify API
    const response = await fetch(`${DIFY_API_URL}/chat-messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DIFY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dififyRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Dify API error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to get response from Dify AI', details: errorText },
        { status: response.status }
      );
    }

    // Stream the response back to client
    const stream = response.body;
    if (!stream) {
      return NextResponse.json(
        { error: 'No response stream from Dify' },
        { status: 500 }
      );
    }

    // Return streaming response with proper headers
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in chat API:', error);
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
  return NextResponse.json(
    {
      message: 'Dify Chat API',
      status: 'active',
      endpoint: 'POST /api/avatar/chat'
    },
    { status: 200 }
  );
}
