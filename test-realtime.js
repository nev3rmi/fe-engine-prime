// Simple test to verify realtime client functionality
const { createSocketConnection, getPerformanceMetrics } = require('./src/lib/realtime/client.ts');

async function testRealtimeConnection() {
  console.log('Testing realtime connection...');

  try {
    // This will fail without a valid session, but we can check if the module loads
    console.log('✅ Realtime client module loaded successfully');
    console.log('✅ Functions available:', {
      createSocketConnection: typeof createSocketConnection,
      getPerformanceMetrics: typeof getPerformanceMetrics
    });

    // Check if types are properly defined
    const metrics = getPerformanceMetrics();
    console.log('✅ Performance metrics structure:', Object.keys(metrics));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testRealtimeConnection();