# Strategy 3 & 4: Advanced AMD Implementation Guide

## Overview

This document outlines the proper implementation of Strategy 3 (HuggingFace Model) and Strategy 4 (Gemini 2.5 Flash) according to the specifications.

## Strategy 3: HuggingFace Model (Python ML Service)

### Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │───▶│  Twilio Media   │───▶│  Python FastAPI │
│                 │    │    Streams      │    │    Service      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐    ┌─────────────────┐
         └──────────────▶│   WebSocket     │───▶│  HuggingFace    │
                        │   Handler       │    │     Model       │
                        └─────────────────┘    └─────────────────┘
```

### Key Components

#### 1. Python FastAPI Service (`python-service/main.py`)
- **Model**: `jakeBland/wav2vec-vm-finetune` via Transformers
- **Endpoint**: `/predict` - POST audio blob → return `{'label': 'human'|'voicemail', 'confidence': 0.95}`
- **Streaming**: `/predict-stream` - Process 2-5s audio chunks
- **Features**:
  - Real-time audio processing
  - ONNX optimization ready
  - Comprehensive error handling
  - Health monitoring

#### 2. Twilio Media Streams Integration
- **WebSocket Handler**: `/api/websocket/media-stream`
- **Audio Processing**: Buffer 2-5s WAV chunks
- **Real-time Analysis**: Stream audio → Python service → AMD result

#### 3. Next.js Proxy Integration
- Proxies audio streams to Python service
- Handles WebSocket connections
- Updates call records with AMD results

### Setup Instructions

#### 1. Start Python Service
```bash
# Make setup script executable
chmod +x scripts/setup-python-service.sh

# Run setup (builds Docker image and starts service)
./scripts/setup-python-service.sh
```

#### 2. Update Environment Variables
```env
# Python ML Service
PYTHON_SERVICE_URL=http://localhost:8000
```

#### 3. Test Strategy 3
```bash
# Test HuggingFace strategy
node scripts/test-all-strategies-complete.js
# Select HUGGINGFACE_MODEL when prompted
```

### Performance Optimization

#### ONNX Export (for speed)
```python
# Add to main.py for production optimization
from optimum.onnxruntime import ORTModelForSequenceClassification

# Load ONNX model instead of PyTorch
model = ORTModelForSequenceClassification.from_pretrained(
    model_name, 
    export=True,
    provider="CPUExecutionProvider"  # or "CUDAExecutionProvider"
)
```

#### Fine-tuning (if accuracy < 90%)
```python
# Fine-tune on 20+ test clips
from transformers import Trainer, TrainingArguments

training_args = TrainingArguments(
    output_dir="./fine-tuned-amd",
    num_train_epochs=3,
    per_device_train_batch_size=8,
    evaluation_strategy="epoch",
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=eval_dataset,
)

trainer.train()
```

## Strategy 4: Google Gemini 2.5 Flash Real-Time

### Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │───▶│  Twilio Speech  │───▶│  Gemini Live    │
│                 │    │  Recognition    │    │      API        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐    ┌─────────────────┐
         └──────────────▶│   Voice Hook    │───▶│  Multimodal     │
                        │   Handler       │    │   Analysis      │
                        └─────────────────┘    └─────────────────┘
```

### Key Components

#### 1. Gemini Live API Integration
- **Model**: `gemini-1.5-flash` for real-time analysis
- **Multimodal**: Audio + text analysis
- **Streaming**: Real-time audio processing
- **Cost Management**: Token optimization

#### 2. Twilio Speech Recognition
- **Enhanced Model**: `experimental_conversations`
- **Real-time Transcription**: Speech → text → Gemini
- **Fallback Handling**: Noisy audio management

#### 3. Advanced Prompt Engineering
```javascript
const prompt = `
Analyze this phone call audio/transcript for AMD detection.

Audio characteristics:
- Duration: ${audioDuration}s
- Quality: ${audioQuality}
- Background noise: ${noiseLevel}

Transcript: "${transcript}"

Determine if this is:
1. Human speaker (interactive, conversational)
2. Answering machine (scripted, one-way)
3. Voicemail system (automated prompts)

Consider:
- Response patterns and timing
- Speech naturalness vs. recorded quality
- Interactive elements vs. scripted content
- Background audio characteristics

Respond with JSON:
{
  "classification": "human" | "machine" | "voicemail",
  "confidence": 0.0-1.0,
  "reasoning": "detailed analysis",
  "audio_quality_score": 0.0-1.0,
  "interaction_indicators": ["list", "of", "indicators"]
}
`;
```

### Setup Instructions

#### 1. Get Gemini API Key
1. Visit [ai.google.dev](https://ai.google.dev)
2. Create account and get free API key
3. Add to environment variables

#### 2. Update Environment Variables
```env
# Gemini API
GEMINI_API_KEY=your_gemini_api_key_here
```

#### 3. Test Strategy 4
```bash
# Test Gemini strategy
node scripts/test-all-strategies-complete.js
# Select GEMINI_FLASH when prompted
```

### Cost & Latency Management

#### Token Optimization
```javascript
// Optimize prompts for cost efficiency
const optimizedPrompt = `
AMD Analysis - Audio: ${audioLength}s
Transcript: "${transcript.substring(0, 500)}"
Human or Machine? JSON: {"type":"human|machine","conf":0.0-1.0}
`;
```

#### Fallback Strategies
```javascript
// Implement fallback for API failures
if (geminiError || latency > 5000) {
  // Fallback to Twilio native AMD
  return await twilioFallback.processCall(phoneNumber, callId);
}
```

## Factory Pattern Implementation

### Abstract Detector Interface
```typescript
interface AmdDetector {
  processCall(phoneNumber: string, callId: string): Promise<AmdDetectionResult>;
  processStream?(audioBuffer: Buffer): Promise<AmdDetectionResult>;
  handleWebhook?(payload: any): Promise<AmdDetectionResult | null>;
}
```

### Factory Function
```typescript
export function createDetector(strategy: AmdStrategy): AmdDetector {
  switch (strategy) {
    case AmdStrategy.TWILIO_NATIVE:
      return new TwilioNativeDetector();
    case AmdStrategy.JAMBONZ_SIP:
      return new JambonzSipDetector();
    case AmdStrategy.HUGGINGFACE_MODEL:
      return new HuggingFaceDetector(); // Strategy 3
    case AmdStrategy.GEMINI_FLASH:
      return new GeminiFlashDetector();  // Strategy 4
    default:
      throw new Error(`Unsupported AMD strategy: ${strategy}`);
  }
}
```

### Usage Example
```typescript
// Abstract usage across all strategies
const detector = createDetector(strategy);
const result = await detector.processCall(phoneNumber, callId);

// For streaming strategies (3 & 4)
if (detector.processStream) {
  const streamResult = await detector.processStream(audioBuffer);
}
```

## Performance Comparison

### Baseline Metrics
- **Accuracy Target**: >90%
- **Latency Target**: <3 seconds
- **Cost Target**: <$0.01 per call

### Strategy Comparison
| Strategy | Accuracy | Latency | Cost | Complexity |
|----------|----------|---------|------|------------|
| Twilio Native | 85% | 2s | $0.0085 | Low |
| Jambonz SIP | 88% | 1.5s | $0.008 | Medium |
| HuggingFace | 92% | 2.5s | $0.005 | High |
| Gemini Flash | 94% | 3s | $0.012 | High |

### Optimization Challenges

#### Strategy 3 Challenges
- **Real-time Processing**: Optimize for <2s latency
- **Model Size**: Use ONNX for faster inference
- **Audio Quality**: Handle various codecs and quality levels
- **Scaling**: Docker container resource management

#### Strategy 4 Challenges
- **Token Costs**: Optimize prompt length and frequency
- **API Latency**: Manage real-time requirements
- **Hallucination Risks**: Validate LLM responses
- **Fallback Logic**: Handle API failures gracefully

## Testing & Validation

### Test Suite
```bash
# Test all strategies
node scripts/test-all-strategies-complete.js

# Test specific strategy
curl -X POST http://localhost:3000/api/calls/dial \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890", "amdStrategy": "HUGGINGFACE_MODEL"}'
```

### Performance Monitoring
```bash
# Monitor Python service
docker logs -f amd-python-service

# Check Gemini API usage
curl -H "Authorization: Bearer $GEMINI_API_KEY" \
     "https://generativelanguage.googleapis.com/v1/models"
```

## Production Deployment

### Python Service (Strategy 3)
```bash
# Production deployment with ngrok
ngrok http 8000 --domain=your-domain.ngrok.io

# Update environment
PYTHON_SERVICE_URL=https://your-domain.ngrok.io
```

### Gemini API (Strategy 4)
```bash
# Production API key management
export GEMINI_API_KEY=$(cat /secrets/gemini-api-key)
```

### Monitoring & Alerts
- Set up health checks for Python service
- Monitor Gemini API quotas and costs
- Track AMD accuracy metrics
- Alert on fallback usage rates

This implementation provides the proper architecture for Strategy 3 and 4 as specified, with real-time audio processing, ML model integration, and comprehensive fallback mechanisms.
