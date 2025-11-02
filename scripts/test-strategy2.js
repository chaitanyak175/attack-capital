#!/usr/bin/env node

/**
 * Test Script for Strategy 2: Twilio + Jambonz (SIP-Enhanced)
 * 
 * This script tests the Jambonz SIP-Enhanced AMD implementation
 * and compares performance with Twilio Native AMD.
 */

const fetch = require('node-fetch');
const readline = require('readline');

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const TEST_NUMBERS = [
  '+1234567890', // Replace with verified test numbers
  '+918855069509', // Indian number from memory
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function testCall(phoneNumber, strategy) {
  console.log(`\n🔄 Testing ${strategy} with ${phoneNumber}...`);
  
  try {
    const response = await fetch(`${BASE_URL}/api/calls/dial`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber,
        amdStrategy: strategy,
      }),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log(`✅ Call initiated successfully`);
      console.log(`   Call ID: ${result.callId}`);
      console.log(`   Strategy: ${strategy}`);
      console.log(`   Status: ${result.status}`);
      
      if (result.metadata) {
        if (result.metadata.jambonzCallSid) {
          console.log(`   Jambonz SID: ${result.metadata.jambonzCallSid}`);
        }
        if (result.metadata.twilioCallSid) {
          console.log(`   Twilio SID: ${result.metadata.twilioCallSid}`);
        }
        if (result.metadata.fallbackUsed) {
          console.log(`   ⚠️  Fallback used: ${result.metadata.fallbackReason}`);
        }
      }
      
      return { success: true, callId: result.callId, result };
    } else {
      console.log(`❌ Call failed: ${result.error || 'Unknown error'}`);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.log(`❌ Request failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function checkCallStatus(callId) {
  try {
    const response = await fetch(`${BASE_URL}/api/calls/${callId}/status`);
    const result = await response.json();
    
    if (response.ok) {
      return result;
    } else {
      console.log(`❌ Status check failed: ${result.error}`);
      return null;
    }
  } catch (error) {
    console.log(`❌ Status request failed: ${error.message}`);
    return null;
  }
}

async function waitForCallCompletion(callId, maxWaitTime = 60000) {
  console.log(`⏳ Waiting for call completion (max ${maxWaitTime/1000}s)...`);
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    const status = await checkCallStatus(callId);
    
    if (status) {
      console.log(`   Status: ${status.status}, AMD: ${status.amdResult || 'pending'}`);
      
      if (status.status === 'COMPLETED' || status.status === 'FAILED' || status.amdResult) {
        return status;
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
  }
  
  console.log(`⏰ Timeout waiting for call completion`);
  return null;
}

async function getPerformanceAnalysis() {
  console.log(`\n📊 Fetching performance analysis...`);
  
  try {
    const response = await fetch(`${BASE_URL}/api/analytics/amd-performance`);
    const result = await response.json();
    
    if (response.ok && result.success) {
      const { jambonzMetrics, twilioMetrics, advantages, recommendations } = result.data;
      
      console.log(`\n📈 Performance Comparison:`);
      console.log(`\nJambonz SIP-Enhanced:`);
      console.log(`  Total Calls: ${jambonzMetrics.totalCalls}`);
      console.log(`  Success Rate: ${jambonzMetrics.successRate.toFixed(1)}%`);
      console.log(`  Avg Response Time: ${jambonzMetrics.averageResponseTime.toFixed(2)}s`);
      console.log(`  Avg Cost: $${jambonzMetrics.averageCost.toFixed(4)}`);
      console.log(`  Accuracy: ${jambonzMetrics.accuracyRate.toFixed(1)}%`);
      if (jambonzMetrics.fallbackRate !== undefined) {
        console.log(`  Fallback Rate: ${jambonzMetrics.fallbackRate.toFixed(1)}%`);
      }
      
      console.log(`\nTwilio Native:`);
      console.log(`  Total Calls: ${twilioMetrics.totalCalls}`);
      console.log(`  Success Rate: ${twilioMetrics.successRate.toFixed(1)}%`);
      console.log(`  Avg Response Time: ${twilioMetrics.averageResponseTime.toFixed(2)}s`);
      console.log(`  Avg Cost: $${twilioMetrics.averageCost.toFixed(4)}`);
      console.log(`  Accuracy: ${twilioMetrics.accuracyRate.toFixed(1)}%`);
      
      if (advantages.jambonz.length > 0) {
        console.log(`\n🚀 Jambonz Advantages:`);
        advantages.jambonz.forEach(adv => console.log(`  • ${adv}`));
      }
      
      if (advantages.twilio.length > 0) {
        console.log(`\n📞 Twilio Advantages:`);
        advantages.twilio.forEach(adv => console.log(`  • ${adv}`));
      }
      
      if (recommendations.length > 0) {
        console.log(`\n💡 Recommendations:`);
        recommendations.forEach(rec => console.log(`  • ${rec}`));
      }
      
      return result.data;
    } else {
      console.log(`❌ Performance analysis failed: ${result.error}`);
      return null;
    }
  } catch (error) {
    console.log(`❌ Performance request failed: ${error.message}`);
    return null;
  }
}

async function testJambonzHealth() {
  console.log(`\n🏥 Testing Jambonz service health...`);
  
  const jambonzUrl = process.env.JAMBONZ_API_BASE_URL;
  const apiKey = process.env.JAMBONZ_API_KEY;
  
  if (!jambonzUrl || !apiKey) {
    console.log(`❌ Jambonz configuration missing`);
    return false;
  }
  
  try {
    const response = await fetch(`${jambonzUrl}/v1/health`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    
    if (response.ok) {
      console.log(`✅ Jambonz service is healthy`);
      return true;
    } else {
      console.log(`❌ Jambonz service unhealthy: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Jambonz health check failed: ${error.message}`);
    return false;
  }
}

async function runInteractiveTest() {
  console.log(`\n🧪 Strategy 2: Jambonz SIP-Enhanced AMD Test Suite`);
  console.log(`=================================================`);
  
  // Check Jambonz health first
  const jambonzHealthy = await testJambonzHealth();
  
  while (true) {
    console.log(`\nTest Options:`);
    console.log(`1. Test Jambonz SIP-Enhanced AMD`);
    console.log(`2. Test Twilio Native AMD (for comparison)`);
    console.log(`3. Run performance comparison`);
    console.log(`4. Test specific phone number`);
    console.log(`5. View performance analytics`);
    console.log(`6. Exit`);
    
    const choice = await question('\nSelect option (1-6): ');
    
    switch (choice) {
      case '1':
        console.log(`\n🔧 Testing Jambonz SIP-Enhanced AMD...`);
        for (const number of TEST_NUMBERS) {
          const result = await testCall(number, 'JAMBONZ_SIP');
          if (result.success) {
            await waitForCallCompletion(result.callId);
          }
        }
        break;
        
      case '2':
        console.log(`\n📞 Testing Twilio Native AMD...`);
        for (const number of TEST_NUMBERS) {
          const result = await testCall(number, 'TWILIO_NATIVE');
          if (result.success) {
            await waitForCallCompletion(result.callId);
          }
        }
        break;
        
      case '3':
        console.log(`\n⚔️  Running performance comparison...`);
        
        // Test both strategies with the same number
        const testNumber = TEST_NUMBERS[0];
        
        console.log(`\nTesting with ${testNumber}:`);
        
        const jambonzResult = await testCall(testNumber, 'JAMBONZ_SIP');
        if (jambonzResult.success) {
          await waitForCallCompletion(jambonzResult.callId);
        }
        
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        
        const twilioResult = await testCall(testNumber, 'TWILIO_NATIVE');
        if (twilioResult.success) {
          await waitForCallCompletion(twilioResult.callId);
        }
        
        break;
        
      case '4':
        const customNumber = await question('Enter phone number (with country code): ');
        const strategy = await question('Enter strategy (JAMBONZ_SIP or TWILIO_NATIVE): ');
        
        const result = await testCall(customNumber, strategy);
        if (result.success) {
          await waitForCallCompletion(result.callId);
        }
        break;
        
      case '5':
        await getPerformanceAnalysis();
        break;
        
      case '6':
        console.log(`\n👋 Exiting test suite...`);
        rl.close();
        return;
        
      default:
        console.log(`❌ Invalid option. Please select 1-6.`);
    }
  }
}

async function main() {
  console.log(`🚀 Starting Strategy 2 Test Suite...`);
  console.log(`Base URL: ${BASE_URL}`);
  
  // Check if server is running
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }
    console.log(`✅ Server is running`);
  } catch (error) {
    console.log(`❌ Server not accessible: ${error.message}`);
    console.log(`Please make sure your Next.js server is running on ${BASE_URL}`);
    process.exit(1);
  }
  
  await runInteractiveTest();
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log(`\n\n👋 Test suite interrupted. Goodbye!`);
  rl.close();
  process.exit(0);
});

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testCall,
  checkCallStatus,
  waitForCallCompletion,
  getPerformanceAnalysis,
  testJambonzHealth,
};
