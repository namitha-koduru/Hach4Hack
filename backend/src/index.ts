import http from 'http';
import { createApp } from './app';
import { config } from './config';
import { initSocket } from './socket';
import { prisma } from './config/prisma';

const app = createApp();
const server = http.createServer(app);

// Initialize real-time Socket.IO
initSocket(server);

// Start server
server.listen(config.port, '0.0.0.0', () => {
  console.log(`=========================================`);
  console.log(`🚀 TeamForge Server running on http://0.0.0.0:${config.port}`);
  console.log(`📡 Environment: ${config.env}`);
  console.log(`🔗 API Base: http://localhost:${config.port}/api`);
  console.log(`⚡ Health Check: http://localhost:${config.port}/api/health`);
  console.log(`=========================================`);
});

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  console.log(`\nReceived ${signal}. Shutting down TeamForge gracefully...`);
  server.close(async () => {
    console.log('HTTP & WebSocket server closed.');
    try {
      await prisma.$disconnect();
      console.log('Prisma database client disconnected.');
      process.exit(0);
    } catch (err) {
      console.error('Error during database disconnect:', err);
      process.exit(1);
    }
  });

  // Force shutdown after 10s timeout
  setTimeout(() => {
    console.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

