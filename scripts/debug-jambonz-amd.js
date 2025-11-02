#!/usr/bin/env node

/**
 * Debug Script for Jambonz AMD Issues
 * 
 * This script helps debug why AMD results are showing as "undecided"
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
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

async function testJambonzDebugCall(phoneNumber) {
  console.log(`\n🔍 Starting debug call to ${phoneNumber}...`);
  
  try {
    const response = await fetch(`${BASE_URL}/api/debug/test-jambonz-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phoneNumber }),
    });

    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Debug call initiated successfully`);
      console.log(`   Jambonz Call SID: ${result.jambonzCallSid}`);
      console.log(`   Debug Webhook URL: ${result.debugWebhookUrl}`);
      console.log(`   AMD Config:`, JSON.stringify(result.amdConfig, null, 2));
      
      console.log(`\n📋 Next steps:`);
      console.log(`1. Answer the call on ${phoneNumber}`);
      console.log(`2. Check the console logs for webhook payloads`);
      console.log(`3. Look for AMD-related fields in the debug output`);
      
      return result.jambonzCallSid;
    } else {
      console.log(`❌ Debug call failed: ${result.error}`);
      if (result.response) {
        console.log(`   Jambonz response: ${result.response}`);
      }
      return null;
    }
  } catch (error) {
    console.log(`❌ Request failed: ${error.message}`);
    return null;
  }
}

async function checkJambonzConfig() {
  console.log(`\n🔧 Checking Jambonz configuration...`);
  
  const requiredEnvVars = [
    'JAMBONZ_API_BASE_URL',
    'JAMBONZ_ACCOUNT_SID', 
    'JAMBONZ_API_KEY',
    'JAMBONZ_SIP_REALM',
    'JAMBONZ_SIP_USERNAME',
    'JAMBONZ_SIP_PASSWORD'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.log(`❌ Missing environment variables: ${missingVars.join(', ')}`);
    return false;
  }
  
  console.log(`✅ All Jambonz environment variables are set`);
  console.log(`   API Base URL: ${process.env.JAMBONZ_API_BASE_URL}`);
  console.log(`   Account SID: ${process.env.JAMBONZ_ACCOUNT_SID}`);
  console.log(`   SIP Realm: ${process.env.JAMBONZ_SIP_REALM}`);
  console.log(`   SIP Username: ${process.env.JAMBONZ_SIP_USERNAME}`);
  
  return true;
}

async function testJambonzHealth() {
  console.log(`\n🏥 Testing Jambonz API health...`);
  
  try {
    const response = await fetch(`${process.env.JAMBONZ_API_BASE_URL}/v1/health`, {
      headers: {
        'Authorization': `Bearer ${process.env.JAMBONZ_API_KEY}`,
      },
    });
    
    if (response.ok) {
      console.log(`✅ Jambonz API is healthy`);
      return true;
    } else {
      console.log(`❌ Jambonz API unhealthy: ${response.status}`);
      const errorText = await response.text();
      console.log(`   Error: ${errorText}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Jambonz API request failed: ${error.message}`);
    return false;
  }
}

async function analyzeAmdIssues() {
  console.log(`\n🔍 Common AMD "undecided" issues and solutions:`);
  console.log(`
1. **Webhook not receiving AMD events**
   - Check if /api/amd-events is receiving webhooks
   - Verify ngrok URL is accessible from Jambonz
   - Look for AMD-specific fields in webhook payload

2. **AMD configuration issues**
   - thresholdWordCount might be too high/low
   - decisionTimeoutMs might be too short
   - actionHook might not be configured properly

3. **Call flow issues**
   - Call might be hanging up before AMD completes
   - No speech detected during AMD analysis
   - Network latency affecting AMD timing

4. **Jambonz service issues**
   - AMD feature might not be enabled on account
   - SIP trunk configuration problems
   - API version compatibility issues
`);

  console.log(`\n💡 Debugging recommendations:`);
  console.log(`
1. Run this debug script to see actual webhook payloads
2. Check server logs for AMD-related messages
3. Verify call duration is sufficient for AMD (>10 seconds)
4. Test with known human vs machine numbers
5. Check Jambonz dashboard for call logs and AMD status
`);
}

async function main() {
  console.log(`🐛 Jambonz AMD Debug Tool`);
  console.log(`========================`);
  
  // Check configuration
  const configOk = await checkJambonzConfig();
  if (!configOk) {
    console.log(`\n❌ Configuration issues found. Please fix and try again.`);
    process.exit(1);
  }
  
  // Check health
  const healthOk = await testJambonzHealth();
  if (!healthOk) {
    console.log(`\n⚠️  Jambonz API health check failed. Continuing anyway...`);
  }
  
  while (true) {
    console.log(`\nDebug Options:`);
    console.log(`1. Test debug call with enhanced logging`);
    console.log(`2. Analyze common AMD issues`);
    console.log(`3. Check Jambonz configuration`);
    console.log(`4. Test Jambonz API health`);
    console.log(`5. Exit`);
    
    const choice = await question('\nSelect option (1-5): ');
    
    switch (choice) {
      case '1':
        const phoneNumber = await question('Enter phone number to test: ');
        await testJambonzDebugCall(phoneNumber);
        
        console.log(`\n📊 Watch your server logs now for webhook payloads...`);
        console.log(`   Look for "JAMBONZ WEBHOOK DEBUG" messages`);
        console.log(`   Check if AMD fields are present in the payload`);
        break;
        
      case '2':
        await analyzeAmdIssues();
        break;
        
      case '3':
        await checkJambonzConfig();
        break;
        
      case '4':
        await testJambonzHealth();
        break;
        
      case '5':
        console.log(`\n👋 Exiting debug tool...`);
        rl.close();
        return;
        
      default:
        console.log(`❌ Invalid option. Please select 1-5.`);
    }
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log(`\n\n👋 Debug tool interrupted. Goodbye!`);
  rl.close();
  process.exit(0);
});

if (require.main === module) {
  main().catch(console.error);
}
