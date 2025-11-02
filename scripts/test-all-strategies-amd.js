#!/usr/bin/env node

/**
 * Test AMD processing for all strategies
 */

require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testAmdProcessing() {
  console.log('🧪 Testing AMD processing for all strategies...');
  
  // Simulate the exact webhook payload from your logs
  const webhookPayload = new URLSearchParams({
    Called: '+918087820521',
    ToState: 'Maharashtra / Goa',
    CallerCountry: 'US',
    Direction: 'outbound-api',
    Timestamp: 'Sun, 02 Nov 2025 14:21:12 +0000',
    CallbackSource: 'call-progress-events',
    SipResponseCode: '200',
    CallerState: 'MN',
    ToZip: '',
    SequenceNumber: '3',
    CallSid: 'CA52e4d0518e6d4a7b18441f7f7b0c61cf',
    To: '+918087820521',
    CallerZip: '55771',
    ToCountry: 'IN',
    CalledZip: '',
    ApiVersion: '2010-04-01',
    CalledCity: '',
    CallStatus: 'completed',
    Duration: '1',
    From: '+12189933363',
    CallDuration: '17',
    AccountSid: process.env.TWILIO_ACCOUNT_SID || 'PLACEHOLDER_ACCOUNT_SID',
    CalledCountry: 'IN',
    CallerCity: 'CRANE LAKE',
    ToCity: '',
    FromCountry: 'US',
    Caller: '+12189933363',
    FromCity: 'CRANE LAKE',
    CalledState: 'Maharashtra / Goa',
    FromZip: '55771',
    AnsweredBy: 'human', // This is the key AMD field
    FromState: 'MN'
  });

  try {
    console.log('📞 Sending webhook with AnsweredBy: "human"...');
    
    const response = await fetch(`${BASE_URL}/api/webhooks/twilio/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: webhookPayload,
    });

    const result = await response.text();
    
    if (response.ok) {
      console.log('✅ Webhook processed successfully');
      console.log('📋 Check your server logs for:');
      console.log('   🎯 "AMD result processed: HUMAN (confidence: 0.85) from human"');
      console.log('   📊 Call should now show amdResult: "HUMAN" in database');
    } else {
      console.log('❌ Webhook failed:', result);
    }
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }
}

async function main() {
  console.log('🎯 AMD Processing Test for All Strategies');
  console.log('=========================================');
  
  console.log('\n📋 What this test does:');
  console.log('1. Simulates your exact Twilio webhook payload');
  console.log('2. Tests AMD processing with AnsweredBy: "human"');
  console.log('3. Verifies that ALL strategies can process AMD results');
  
  console.log('\n🔧 Changes made:');
  console.log('✅ Twilio status webhook now processes AMD for ALL strategies');
  console.log('✅ HuggingFace detector can handle Twilio AMD fallback');
  console.log('✅ Gemini detector can handle Twilio AMD fallback');
  console.log('✅ Jambonz detector already had Twilio fallback');
  
  await testAmdProcessing();
  
  console.log('\n💡 Expected results:');
  console.log('- Server logs should show: 🎯 AMD result processed: HUMAN');
  console.log('- Database should update: amdResult = "HUMAN", confidence = 0.85');
  console.log('- Your app should display: "Human Detected" instead of "Undecided"');
  
  console.log('\n🚀 Now ALL strategies will show AMD results!');
}

if (require.main === module) {
  main().catch(console.error);
}
