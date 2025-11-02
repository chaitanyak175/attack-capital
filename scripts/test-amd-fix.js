#!/usr/bin/env node

/**
 * Test script to verify AMD result processing fix
 */

require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testTwilioWebhook() {
  console.log('🧪 Testing Twilio webhook with AnsweredBy field...');
  
  // Simulate the webhook payload you received
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
    AnsweredBy: 'human', // This is the key field
    FromState: 'MN'
  });

  try {
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
      console.log('📋 Check your database - the call should now show AMD result as HUMAN');
      console.log('📋 Check your server logs for: "AMD result processed: HUMAN"');
    } else {
      console.log('❌ Webhook failed:', result);
    }
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }
}

async function main() {
  console.log('🔧 Testing AMD Result Fix');
  console.log('========================');
  
  await testTwilioWebhook();
  
  console.log('\n💡 What should happen now:');
  console.log('1. The webhook should process the AnsweredBy: "human" field');
  console.log('2. Your call record should update with amdResult: "HUMAN"');
  console.log('3. You should see "AMD result processed: HUMAN" in server logs');
  console.log('\n🔍 To verify: Check your call history in the app or database');
}

if (require.main === module) {
  main().catch(console.error);
}
