import { NextApiRequest, NextApiResponse } from 'next';
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { initializeSocketServer, getSocketServer } from '@/lib/realtime/server';

// Type for the extended response with socket server
type NextApiResponseWithSocket = NextApiResponse & {
  socket: {
    server: HTTPServer & {
      io?: SocketIOServer;
    };
  };
};

/**
 * Socket.io initialization endpoint for Next.js
 * This endpoint initializes the Socket.io server when called
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const resWithSocket = res as NextApiResponseWithSocket;
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Check if Socket.io server is already initialized
    if (!resWithSocket.socket.server.io) {
      console.log('Initializing Socket.io server...');

      // Initialize the Socket.io server
      const io = initializeSocketServer(resWithSocket.socket.server);
      resWithSocket.socket.server.io = io;

      console.log('Socket.io server initialized successfully');
    } else {
      console.log('Socket.io server already initialized');
    }

    // Return server status
    const socketServer = getSocketServer();
    const connectedClientsCount = socketServer?.engine?.clientsCount || 0;

    res.status(200).json({
      success: true,
      message: 'Socket.io server is running',
      connectedClients: connectedClientsCount,
      serverUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    });
  } catch (error) {
    console.error('Error initializing Socket.io server:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize Socket.io server',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Important: Disable body parser for this endpoint
export const config = {
  api: {
    bodyParser: false,
  },
};