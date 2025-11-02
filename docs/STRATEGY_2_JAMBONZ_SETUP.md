# Strategy 2: Twilio + Jambonz (SIP-Enhanced) Setup Guide

## Overview
Strategy 2 implements an enhanced AMD system using Jambonz for SIP-based call routing with Twilio as a fallback mechanism. This approach provides improved AMD detection through custom recognizers and enhanced SIP routing capabilities.

## Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Your App      │───▶│    Jambonz      │───▶│   SIP Trunk     │
│                 │    │   (Primary)     │    │   (Enhanced)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         │              ┌─────────────────┐
         └──────────────▶│     Twilio      │
                        │   (Fallback)    │
                        └─────────────────┘
```

## Features Implemented

### ✅ Core Components
- **Enhanced AMD Webhook Handler**: `/api/amd-events` with improved event processing
- **Speech Verification**: `/api/amd-events/verify` for human verification
- **SIP Routing**: Enhanced SIP trunk configuration with authentication
- **Twilio Fallback**: Automatic fallback when Jambonz is unavailable
- **Custom AMD Parameters**: `thresholdWordCount: 5`, `decisionTimeoutMs: 10000`

### ✅ Advanced Features
- **Service Availability Check**: Health monitoring for Jambonz service
- **Multiple Phone Format Support**: Handles various international number formats
- **Cost Optimization**: Different pricing models for Jambonz vs Twilio
- **Enhanced Logging**: Comprehensive logging for debugging and monitoring

## Setup Instructions

### 1. Jambonz Configuration

#### Option A: Self-Hosted Jambonz
```bash
# Clone Jambonz repository
git clone https://github.com/jambonz/jambonz-helm-charts.git
cd jambonz-helm-charts

# Install with Helm (requires Kubernetes)
helm install jambonz ./charts/jambonz
```

#### Option B: Jambonz Cloud Trial
1. Visit [https://jambonz.cloud](https://jambonz.cloud)
2. Sign up for free trial account
3. Get your API credentials from the dashboard

### 2. Environment Variables
Update your `.env` file with Jambonz credentials:

```env
# Jambonz (Strategy 2: SIP-Enhanced)
JAMBONZ_API_BASE_URL=https://api.jambonz.cloud
JAMBONZ_ACCOUNT_SID=your_account_sid
JAMBONZ_API_KEY=your_api_key
JAMBONZ_SIP_REALM=your_realm.sip.jambonz.cloud
JAMBONZ_SIP_USERNAME=your_sip_username
JAMBONZ_SIP_PASSWORD=your_sip_password
```

### 3. Twilio SIP Trunk Setup

#### Create SIP Trunk in Twilio Console
1. Go to **Elastic SIP Trunking** → **Trunks**
2. Create new trunk with these settings:
   - **Friendly Name**: "Jambonz SIP Trunk"
   - **SIP URI**: `sip:your_realm.sip.jambonz.cloud`
   - **Authentication**: Use the credentials from Jambonz

#### Configure Origination URLs
Add your Jambonz SIP endpoint:
```
sip:your_realm.sip.jambonz.cloud:5060
```

#### Configure Termination URIs
Add your application's SIP URI for incoming calls.

### 4. Webhook Configuration

The system automatically configures webhooks to point to:
- **Primary**: `/api/amd-events` (Jambonz AMD events)
- **Verification**: `/api/amd-events/verify` (Speech verification)
- **Fallback**: `/api/webhooks/twilio/voice` (Twilio fallback)

## AMD Parameters (Strategy 2 Specifications)

```javascript
{
  amd: {
    enabled: true,
    thresholdWordCount: 5,        // Strategy 2 requirement
    timers: {
      decisionTimeoutMs: 10000,   // Strategy 2 requirement
      toneTimeoutMs: 20000,
      noSpeechTimeoutMs: 5000,
    },
  }
}
```

## Call Flow

### 1. Initial Call Setup
```
App → Jambonz API → SIP Trunk → Target Phone
```

### 2. AMD Detection Events
- `amd_human_detected` → Play greeting message
- `amd_machine_detected` → Hang up immediately  
- `amd_decision_timeout` → Request speech verification

### 3. Fallback Mechanism
```
Jambonz Unavailable → Automatic Twilio Fallback → Continue with Twilio AMD
```

## Testing the Implementation

### 1. Test Jambonz AMD
```bash
curl -X POST http://localhost:3000/api/calls/dial \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "amdStrategy": "JAMBONZ_SIP"
  }'
```

### 2. Test Fallback Mechanism
Temporarily disable Jambonz service to test Twilio fallback:
```bash
# Set invalid Jambonz URL to trigger fallback
export JAMBONZ_API_BASE_URL=https://invalid-url.com
```

### 3. Monitor Logs
```bash
# Watch for AMD events and fallback triggers
tail -f logs/app.log | grep -E "(Jambonz|AMD|Fallback)"
```

## Performance Analysis

### Why Jambonz Might Outperform Twilio Native

1. **Custom Recognizers**: Jambonz allows custom AMD models
2. **Lower Latency**: Direct SIP routing reduces hop count
3. **Enhanced Control**: Fine-tuned AMD parameters
4. **Cost Efficiency**: Potentially lower per-minute costs
5. **Flexibility**: Custom business logic in webhooks

### Metrics to Monitor

```javascript
{
  "amdAccuracy": "percentage of correct detections",
  "responseTime": "time from call initiation to AMD decision",
  "fallbackRate": "percentage of calls using Twilio fallback",
  "costPerCall": "average cost comparison between providers"
}
```

## Troubleshooting

### Common Issues

#### 1. Jambonz Service Unavailable
```
Error: Jambonz service unavailable, falling back to Twilio Native
Solution: Check JAMBONZ_API_BASE_URL and service status
```

#### 2. SIP Authentication Failed
```
Error: SIP trunk authentication failed
Solution: Verify JAMBONZ_SIP_USERNAME and JAMBONZ_SIP_PASSWORD
```

#### 3. Phone Number Format Issues
```
Error: Jambonz rejected all phone number formats
Solution: The system tries multiple formats automatically, check logs for details
```

### Debug Commands

```bash
# Test Jambonz API connectivity
curl -H "Authorization: Bearer $JAMBONZ_API_KEY" \
     "$JAMBONZ_API_BASE_URL/v1/health"

# Test webhook endpoint
curl -X POST http://localhost:3000/api/amd-events \
     -H "Content-Type: application/json" \
     -d '{"call_sid":"test","amd_human_detected":true}'
```

## Next Steps

1. **Monitor Performance**: Compare AMD accuracy between Jambonz and Twilio
2. **Optimize Parameters**: Fine-tune `thresholdWordCount` and `decisionTimeoutMs`
3. **Scale Testing**: Test with higher call volumes
4. **Custom Models**: Implement custom AMD recognizers in Jambonz
5. **Analytics Dashboard**: Build monitoring for Strategy 2 performance

## Resources

- [Jambonz Documentation](https://docs.jambonz.org)
- [Jambonz AMD Guide](https://docs.jambonz.org/webhooks/amd/)
- [Twilio SIP Trunking](https://www.twilio.com/docs/sip-trunking)
- [SIP Protocol RFC](https://tools.ietf.org/html/rfc3261)
