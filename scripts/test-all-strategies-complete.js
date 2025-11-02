#!/usr/bin/env node

/**
 * Test all AMD strategies to ensure they all show AMD results
 */

// Use built-in fetch (Node.js 18+) or install node-fetch
const fetch = globalThis.fetch || (async (...args) => {
  const { default: fetch } = await import('node-fetch');
  return fetch(...args);
});
const readline = require('readline');

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function testStrategy(phoneNumber, strategy) {
  console.log(`\n🧪 Testing ${strategy} strategy...`);
  
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
      console.log(`✅ ${strategy} call initiated successfully`);
      console.log(`   Call ID: ${result.callId}`);
      console.log(`   Status: ${result.status}`);
      
      if (result.metadata) {
        if (result.metadata.twilioCallSid) {
          console.log(`   Twilio SID: ${result.metadata.twilioCallSid}`);
        }
        if (result.metadata.jambonzCallSid) {
          console.log(`   Jambonz SID: ${result.metadata.jambonzCallSid}`);
        }
        if (result.metadata.fallbackUsed) {
          console.log(`   ⚠️  Fallback used: ${result.metadata.fallbackReason}`);
        }
      }
      
      return { success: true, callId: result.callId, strategy };
    } else {
      console.log(`❌ ${strategy} call failed: ${result.error || 'Unknown error'}`);
      return { success: false, error: result.error, strategy };
    }
  } catch (error) {
    console.log(`❌ ${strategy} request failed: ${error.message}`);
    return { success: false, error: error.message, strategy };
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

async function waitForAmdResult(callId, strategy, maxWaitTime = 45000) {
  console.log(`⏳ Waiting for AMD result for ${strategy} (max ${maxWaitTime/1000}s)...`);
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    const status = await checkCallStatus(callId);
    
    if (status) {
      console.log(`   Status: ${status.status}, AMD: ${status.amdResult || 'pending'}`);
      
      if (status.amdResult && status.amdResult !== 'UNDECIDED') {
        console.log(`🎯 ${strategy} AMD Result: ${status.amdResult} (confidence: ${status.confidence})`);
        return status;
      }
      
      if (status.status === 'COMPLETED' || status.status === 'FAILED') {
        if (status.amdResult === 'UNDECIDED' || !status.amdResult) {
          console.log(`⚠️  ${strategy} completed but AMD result is still: ${status.amdResult || 'null'}`);
        }
        return status;
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
  }
  
  console.log(`⏰ Timeout waiting for ${strategy} AMD result`);
  return null;
}

async function testAllStrategies() {
  const phoneNumber = await question('Enter phone number to test (e.g., +918087820521): ');
  
  const strategies = [
    'TWILIO_NATIVE',
    'JAMBONZ_SIP', 
    'HUGGINGFACE_MODEL',
    'GEMINI_FLASH'
  ];
  
  console.log(`\n🚀 Testing all AMD strategies with ${phoneNumber}`);
  console.log(`📋 Each strategy should now show AMD results!`);
  
  const results = [];
  
  for (const strategy of strategies) {
    const result = await testStrategy(phoneNumber, strategy);
    
    if (result.success) {
      const amdResult = await waitForAmdResult(result.callId, strategy);
      results.push({
        strategy,
        callId: result.callId,
        amdResult: amdResult?.amdResult || 'TIMEOUT',
        confidence: amdResult?.confidence || 0,
        success: amdResult?.amdResult && amdResult.amdResult !== 'UNDECIDED'
      });
    } else {
      results.push({
        strategy,
        error: result.error,
        success: false
      });
    }
    
    // Wait between calls to avoid rate limiting
    if (strategy !== strategies[strategies.length - 1]) {
      console.log(`\n⏸️  Waiting 10 seconds before next strategy...`);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  
  // Summary
  console.log(`\n📊 AMD Results Summary:`);
  console.log(`========================`);
  
  results.forEach(result => {
    if (result.success) {
      console.log(`✅ ${result.strategy}: ${result.amdResult} (${result.confidence})`);
    } else {
      console.log(`❌ ${result.strategy}: ${result.error || 'Failed'}`);
    }
  });
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n🎯 Success Rate: ${successCount}/${strategies.length} strategies showing AMD results`);
  
  if (successCount === strategies.length) {
    console.log(`🎉 Perfect! All strategies are now showing AMD results!`);
  } else {
    console.log(`⚠️  Some strategies still need attention.`);
  }
}

async function main() {
  console.log(`🎯 Complete AMD Strategy Test`);
  console.log(`============================`);
  
  console.log(`\n🔧 Recent fixes applied:`);
  console.log(`✅ Twilio status webhook processes AMD for ALL strategies`);
  console.log(`✅ HuggingFace detector now enables Twilio AMD`);
  console.log(`✅ Gemini detector now enables Twilio AMD`);
  console.log(`✅ All detectors have handleWebhook() methods`);
  
  console.log(`\n📋 This test will:`);
  console.log(`1. Test all 4 AMD strategies with the same phone number`);
  console.log(`2. Wait for AMD results from each strategy`);
  console.log(`3. Show a summary of which strategies work`);
  
  const proceed = await question('\nProceed with testing? (y/n): ');
  
  if (proceed.toLowerCase() === 'y' || proceed.toLowerCase() === 'yes') {
    await testAllStrategies();
  } else {
    console.log(`👋 Test cancelled.`);
  }
  
  rl.close();
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log(`\n\n👋 Test interrupted. Goodbye!`);
  rl.close();
  process.exit(0);
});

if (require.main === module) {
  main().catch(console.error);
}
