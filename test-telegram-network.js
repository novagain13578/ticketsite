/**
 * MINI NETWORK DIAGNOSTIC - Test Telegram API Connectivity
 * Run: node test-telegram-network.js
 */

console.log('🔍 Testing network connectivity to Telegram API...\n');

(async () => {
  try {
    const response = await fetch('https://api.telegram.org/', { timeout: 5000 });
    console.log('✅ SUCCESS: Telegram API domain is reachable');
    console.log(`   Status: ${response.status}`);
  } catch (err) {
    console.log('❌ FAILED: Cannot reach Telegram API');
    console.log(`   Error Type: ${err.code || err.name}`);
    console.log(`   Message: ${err.message}`);
    console.log(`   Cause: ${err.cause || 'Unknown'}`);
  }
})();
