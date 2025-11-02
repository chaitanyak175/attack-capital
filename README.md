# 🎯 Attack Capital AMD System

**Advanced Answering Machine Detection (AMD) for Telephony** - A comprehensive solution implementing multiple AI-powered AMD strategies for outbound call automation with real-time audio processing.

## 📋 Project Overview

This system provides a secure, scalable web application built with Next.js that initiates outbound calls via Twilio and detects whether a human or machine answers using multiple AI-powered strategies. The system connects only on human pickup and automatically hangs up on voicemail/machine detection.

### ✨ Key Features

- **4 AMD Strategies**: Twilio Native, Jambonz SIP, HuggingFace ML, Gemini Flash
- **Real-time Audio Processing**: WebSocket streaming for live analysis
- **Modern UI**: Built with shadcn/ui components and Tailwind CSS
- **Auto-Service Management**: Automatic Python service startup via Docker
- **Performance Analytics**: Compare AMD strategies with detailed metrics
- **Secure Authentication**: Better-Auth integration with session management

## 🏗️ Architecture

### Tech Stack

- **Frontend/Backend**: Next.js 16+ (App Router, TypeScript, React 19)
- **UI Components**: shadcn/ui, Radix UI, Tailwind CSS 4
- **Database**: PostgreSQL via Prisma ORM
- **Authentication**: Better-Auth with email/password
- **AI/ML**: Python FastAPI microservice for HuggingFace models
- **Telephony**: Twilio SDK, Jambonz for SIP-based AMD
- **AI Models**: Gemini 1.5 Flash, HuggingFace Wav2Vec2 (`jakeBland/wav2vec-vm-finetune`)
- **Real-time**: WebSocket for audio streaming, Server-Sent Events

### AMD Strategies Implemented

| Strategy              | Technology                      | Accuracy | Latency | Use Case                           |
| --------------------- | ------------------------------- | -------- | ------- | ---------------------------------- |
| **1. Twilio Native**  | Built-in Twilio AMD             | ~80%     | <2s     | Reliable baseline, general purpose |
| **2. Jambonz SIP**    | SIP-enhanced with custom params | ~85%     | <3s     | Enhanced detection, custom tuning  |
| **3. HuggingFace ML** | `jakeBland/wav2vec-vm-finetune` | ~90%     | 2-5s    | High accuracy, ML-powered          |
| **4. Gemini Flash**   | Real-time LLM analysis          | ~88%     | 1-3s    | Conversational AI, real-time       |

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ (with pnpm)
- **Python** 3.9+
- **PostgreSQL** database
- **Docker** (optional, for containerized services)
- **Twilio Account** with credits and phone number
- **Google Gemini API** key

### 1. Clone & Install

```bash
# Clone the repository
git clone <repository-url>
cd attack-capital

# Install Node.js dependencies
pnpm install

# Install Python service dependencies
cd python-service
pip install -r requirements.txt
cd ..
```

### 2. Environment Configuration

Create `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/amd_system"

# Twilio Configuration
TWILIO_ACCOUNT_SID="your_twilio_account_sid"
TWILIO_AUTH_TOKEN="your_twilio_auth_token"
TWILIO_PHONE_NUMBER="+1234567890"

# AI Services
GEMINI_API_KEY="your_gemini_api_key"
PYTHON_SERVICE_URL="http://localhost:8000"

# Authentication
BETTER_AUTH_SECRET="your-super-secret-key-change-in-production"
BETTER_AUTH_URL="http://localhost:3001"

# Development URLs
NEXT_PUBLIC_APP_URL="http://localhost:3001"
NGROK_URL="https://your-ngrok-url.ngrok.io"

# Optional: Jambonz SIP Configuration
JAMBONZ_API_BASE_URL="https://your-jambonz-instance.com"
JAMBONZ_ACCOUNT_SID="your_jambonz_account_sid"
JAMBONZ_API_KEY="your_jambonz_api_key"
JAMBONZ_SIP_REALM="your-sip-realm"
JAMBONZ_SIP_USERNAME="your-sip-username"
JAMBONZ_SIP_PASSWORD="your-sip-password"
```

### 3. Database Setup

```bash
# Generate Prisma client
pnpm db:generate

# Run database migrations
pnpm db:migrate

# Optional: Seed database with demo user
pnpm db:seed
```

### 4. Development Setup

#### Option A: Manual Start (Recommended for Development)

```bash
# Terminal 1: Start Next.js development server
pnpm run dev

# Terminal 2: Start Python ML service (choose one method)
# Method 1: Using npm script
pnpm python:dev

# Method 2: Manual command
cd python-service
python app.py

# Optional Terminal 3: Open Prisma Studio
pnpm db:studio
```

#### Option B: Docker Compose (Full Stack)

```bash
# Start all services with Docker
pnpm docker:up

# View logs
pnpm docker:logs

# Stop services
pnpm docker:down
```

### 5. Access the Application

- **Main Application**: http://localhost:3001
- **Python ML Service**: http://localhost:8000
- **Prisma Studio**: http://localhost:5555 (if running)

### 6. Initial Setup

1. **Create Demo User**: Visit `/auth` and sign up or use demo login
2. **Test Twilio**: Verify your Twilio credentials work
3. **Test AMD Strategies**: Try each strategy with test numbers

## 📊 AMD Strategy Comparison

| Strategy      | Accuracy | Latency | Cost   | Use Case                              |
| ------------- | -------- | ------- | ------ | ------------------------------------- |
| Twilio Native | ~80%     | <2s     | Low    | General purpose, reliable baseline    |
| Jambonz SIP   | ~85%     | <3s     | Medium | Enhanced detection, custom tuning     |
| HuggingFace   | ~90%     | 2-5s    | Medium | High accuracy, ML-powered             |
| Gemini Flash  | ~88%     | 1-3s    | Higher | Real-time analysis, conversational AI |

## 🧪 Testing

### Test Numbers for Voicemail Simulation

- **Costco**: 1-800-774-2678
- **Nike**: 1-800-806-6453
- **PayPal**: 1-888-221-1161

### Testing Protocol

1. Test each strategy with 10+ calls to voicemail numbers
2. Test human detection with personal phone
3. Verify >85% machine detection accuracy
4. Log false positives/negatives

## 🔧 Key Features

### Dialing Interface

- Phone number input with validation
- AMD strategy selection dropdown
- Real-time call status updates
- Confidence scoring display

### Call History

- Paginated call logs with filtering
- Export to CSV functionality
- Performance analytics per strategy
- Cost tracking and reporting

### Security & Authentication

- Better-Auth integration
- Input validation with Zod
- Rate limiting on API endpoints
- Secure webhook handling

## 📜 Available Scripts

### Development Commands

```bash
pnpm dev              # Start Next.js development server
pnpm dev:full         # Start full development stack
pnpm build            # Build for production
pnpm start            # Start production server
pnpm lint             # Run ESLint
```

### Database Commands

```bash
pnpm db:generate      # Generate Prisma client
pnpm db:migrate       # Run database migrations
pnpm db:reset         # Reset database (destructive)
pnpm db:studio        # Open Prisma Studio
pnpm db:seed          # Seed database with demo data
```

### Service Commands

```bash
pnpm python:dev       # Start Python ML service
pnpm docker:up        # Start Docker services
pnpm docker:down      # Stop Docker services
pnpm docker:logs      # View Docker logs
```

### Testing Commands

```bash
pnpm test:strategies  # Test all AMD strategies
pnpm setup            # Run initial project setup
```

## 📁 Project Structure

```
attack-capital/
├── src/
│   ├── app/                           # Next.js App Router
│   │   ├── api/                      # API Routes
│   │   │   ├── calls/               # Call management APIs
│   │   │   │   ├── dial/            # Initiate calls
│   │   │   │   └── [callId]/status/ # Call status tracking
│   │   │   ├── webhooks/            # Webhook handlers
│   │   │   │   ├── twilio/         # Twilio webhooks
│   │   │   │   └── jambonz/        # Jambonz webhooks
│   │   │   ├── auth/               # Better-Auth endpoints
│   │   │   ├── analytics/          # Performance analytics
│   │   │   └── websocket/          # WebSocket handlers
│   │   ├── auth/                   # Authentication pages
│   │   ├── globals.css             # Global styles
│   │   ├── layout.tsx              # Root layout
│   │   └── page.tsx                # Main dashboard
│   ├── components/                 # React Components
│   │   ├── ui/                    # shadcn/ui components
│   │   ├── providers/             # Context providers
│   │   ├── DialingInterface.tsx   # Call initiation UI
│   │   └── CallHistory.tsx        # Call logs & analytics
│   └── lib/                       # Utilities & Configuration
│       ├── auth.ts               # Better-Auth config
│       ├── prisma.ts             # Database client
│       ├── amdStrategies.ts      # AMD strategy implementations
│       ├── phoneUtils.ts         # Phone number utilities
│       └── serviceStartup.ts     # Auto-service management
├── python-service/                # ML Microservice
│   ├── main.py                   # FastAPI application
│   ├── app.py                    # Alternative entry point
│   ├── requirements.txt          # Python dependencies
│   └── Dockerfile               # Container configuration
├── prisma/                       # Database Schema
│   ├── schema.prisma            # Prisma schema definition
│   └── seed.ts                  # Database seeding
├── scripts/                      # Utility Scripts
│   └── test-strategies-complete.js # AMD strategy testing
├── docker-compose.yml            # Multi-service orchestration
├── components.json               # shadcn/ui configuration
└── .env                         # Environment variables
```

## 🔄 API Endpoints

### Call Management

- `POST /api/calls/dial` - Initiate outbound call
- `GET /api/calls/{id}/status` - Get call status
- `GET /api/calls` - List calls with filtering

### Webhooks

- `POST /api/webhooks/twilio/voice` - Twilio voice webhook
- `POST /api/webhooks/twilio/status` - Twilio status updates
- `POST /api/webhooks/jambonz` - Jambonz AMD events

### Python ML Service

- `POST /predict` - Audio file AMD prediction
- `GET /health` - Service health check
- `GET /model-info` - Model information

## 🐳 Docker Deployment

### Python Service

```bash
cd python-service
docker build -t amd-python-service .
docker run -p 8000:8000 amd-python-service
```

### Full Stack (Docker Compose)

```bash
docker-compose up -d
```

## 🔍 Monitoring & Logging

- Call logs stored in PostgreSQL
- Real-time status updates via polling
- Error tracking and webhook validation
- Performance metrics per AMD strategy

## 🔧 Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Check what's using port 3001
netstat -ano | findstr :3001

# Kill process (Windows)
taskkill /PID <process_id> /F

# Or use different port
PORT=3002 pnpm dev
```

#### Database Connection Issues

```bash
# Reset database
pnpm db:reset

# Regenerate Prisma client
pnpm db:generate

# Check PostgreSQL is running
pg_isready -h localhost -p 5432
```

#### Python Service Not Starting

```bash
# Check Python version
python --version

# Install dependencies manually
cd python-service
pip install --upgrade pip
pip install -r requirements.txt

# Test service directly
python app.py
```

#### Twilio Webhook Issues

1. **Ngrok Setup**: Ensure ngrok is running and URL is updated in `.env`
2. **Webhook URLs**: Verify Twilio webhook URLs point to your ngrok URL
3. **Phone Number**: Ensure your Twilio phone number is verified

#### HuggingFace Model Loading

```bash
# Pre-download model (optional)
cd python-service
python -c "from transformers import Wav2Vec2ForSequenceClassification; Wav2Vec2ForSequenceClassification.from_pretrained('jakeBland/wav2vec-vm-finetune')"
```

### Environment Variables Checklist

Required for basic functionality:

- ✅ `DATABASE_URL`
- ✅ `TWILIO_ACCOUNT_SID`
- ✅ `TWILIO_AUTH_TOKEN`
- ✅ `TWILIO_PHONE_NUMBER`
- ✅ `BETTER_AUTH_SECRET`

Optional for enhanced features:

- 🔧 `GEMINI_API_KEY` (for Strategy 4)
- 🔧 `JAMBONZ_*` variables (for Strategy 2)
- 🔧 `NGROK_URL` (for webhook development)

## 🧪 Testing & Validation

### Test Phone Numbers (Voicemail Simulation)

```bash
# US Numbers for testing machine detection
1-800-774-2678  # Costco (reliable voicemail)
1-800-806-6453  # Nike (automated system)
1-888-221-1161  # PayPal (interactive voice response)
```

### AMD Strategy Testing

```bash
# Run comprehensive strategy tests
pnpm test:strategies

# Test specific strategy
node scripts/test-single-strategy.js --strategy=TWILIO_NATIVE --number=+18007742678
```

### Performance Benchmarks

- **Target Accuracy**: >85% for machine detection
- **Response Time**: <5 seconds for AMD decision
- **Uptime**: 99.9% service availability
- **Concurrent Calls**: Support 50+ simultaneous calls

### Validation Checklist

- [ ] All 4 AMD strategies functional
- [ ] Webhook endpoints responding correctly
- [ ] Database migrations applied
- [ ] Authentication flow working
- [ ] Real-time audio processing active
- [ ] Error handling and logging operational

## 🔍 Monitoring & Analytics

### Key Metrics to Track

- **AMD Accuracy**: True positive/negative rates per strategy
- **Call Volume**: Calls per hour/day by strategy
- **Response Times**: Average detection latency
- **Error Rates**: Failed calls and webhook errors
- **Cost Analysis**: Per-call costs by provider

### Dashboard Features

- Real-time call status monitoring
- Strategy performance comparison
- Cost tracking and optimization
- Error rate alerts and notifications

### Development Guidelines

- Follow TypeScript strict mode
- Use Prettier for code formatting
- Write tests for new AMD strategies
- Update documentation for API changes

## 🆘 Support & Resources

### Documentation

- [Twilio Voice API](https://www.twilio.com/docs/voice)
- [Better-Auth Documentation](https://www.better-auth.com/docs)
- [Prisma ORM Guide](https://www.prisma.io/docs)
- [shadcn/ui Components](https://ui.shadcn.com)

### Performance Optimization

- Monitor call success rates via analytics dashboard
- Optimize AMD parameters based on your use case
- Scale Python service based on call volume
- Implement caching for frequently accessed data

---

**🎯 Built for Attack Capital Assignment** - Demonstrating advanced telephony integration with multiple AMD strategies, real-time audio processing, and modern web application architecture.
