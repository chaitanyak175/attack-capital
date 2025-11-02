import { AmdStrategy, AmdResult } from "@prisma/client";
import twilio from "twilio";
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface AmdDetectionResult {
  result: AmdResult;
  confidence: number;
  metadata?: Record<string, any>;
}

export interface AmdDetector {
  processCall(phoneNumber: string, callId: string): Promise<AmdDetectionResult>;
  handleWebhook?(payload: any): Promise<AmdDetectionResult | null>;
}

export class TwilioNativeDetector implements AmdDetector {
  private client: twilio.Twilio;

  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );
  }

  async processCall(phoneNumber: string, callId: string): Promise<AmdDetectionResult> {
    try {
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? process.env.NGROK_URL
        : process.env.NEXT_PUBLIC_APP_URL;
        
      const call = await this.client.calls.create({
        to: phoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER!,
        url: `${baseUrl}/api/webhooks/twilio/voice`,
        statusCallback: `${baseUrl}/api/webhooks/twilio/status`,
        statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
        statusCallbackMethod: "POST",
        machineDetection: "Enable",
        machineDetectionTimeout: 30,
        machineDetectionSpeechThreshold: 2400,
        machineDetectionSpeechEndThreshold: 1200,
        machineDetectionSilenceTimeout: 5000,
      });

      return {
        result: AmdResult.UNDECIDED,
        confidence: 0,
        metadata: {
          twilioCallSid: call.sid,
          status: call.status,
        },
      };
    } catch (error) {
      console.error("Twilio call error:", error);
      
      if (error && typeof error === 'object' && 'code' in error && error.code === 21219) {
        return {
          result: AmdResult.ERROR,
          confidence: 0,
          metadata: { 
            error: "Trial account limitation: Can only call verified numbers. Please verify the phone number in your Twilio console or upgrade your account.",
            twilioError: error instanceof Error ? error.message : "Unknown error"
          },
        };
      }
      
      return {
        result: AmdResult.ERROR,
        confidence: 0,
        metadata: { error: error instanceof Error ? error.message : "Unknown error" },
      };
    }
  }

  async handleWebhook(payload: any): Promise<AmdDetectionResult | null> {
    const { AnsweringMachineDetectionStatus, AnsweredBy, CallStatus } = payload;

    const amdStatus = AnsweringMachineDetectionStatus || AnsweredBy;

    if (amdStatus) {
      switch (amdStatus) {
        case "human":
          return {
            result: AmdResult.HUMAN,
            confidence: 0.85,
            metadata: { 
              twilioAmd: amdStatus,
              source: AnsweredBy ? "AnsweredBy" : "AnsweringMachineDetectionStatus"
            },
          };
        case "machine_start":
        case "machine_end_beep":
        case "machine_end_silence":
        case "machine":
          return {
            result: AmdResult.MACHINE,
            confidence: 0.8,
            metadata: { 
              twilioAmd: amdStatus,
              source: AnsweredBy ? "AnsweredBy" : "AnsweringMachineDetectionStatus"
            },
          };
        case "fax":
          return {
            result: AmdResult.MACHINE,
            confidence: 0.9,
            metadata: { 
              twilioAmd: amdStatus,
              source: AnsweredBy ? "AnsweredBy" : "AnsweringMachineDetectionStatus"
            },
          };
        default:
          return {
            result: AmdResult.UNDECIDED,
            confidence: 0.3,
            metadata: { 
              twilioAmd: amdStatus,
              source: AnsweredBy ? "AnsweredBy" : "AnsweringMachineDetectionStatus"
            },
          };
      }
    }

    return null;
  }
}

export class JambonzSipDetector implements AmdDetector {
  private twilioFallback: TwilioNativeDetector;

  constructor() {
    this.twilioFallback = new TwilioNativeDetector();
  }

  async processCall(phoneNumber: string, callId: string): Promise<AmdDetectionResult> {
    try {
      if (!process.env.JAMBONZ_API_BASE_URL || !process.env.JAMBONZ_ACCOUNT_SID || !process.env.JAMBONZ_API_KEY) {
        console.log("Jambonz not configured, falling back to Twilio Native");
        return await this.fallbackToTwilio(phoneNumber, callId, "Jambonz not configured");
      }

      const isJambonzAvailable = await this.checkJambonzAvailability();
      if (!isJambonzAvailable) {
        console.log("Jambonz service unavailable, falling back to Twilio Native");
        return await this.fallbackToTwilio(phoneNumber, callId, "Jambonz service unavailable");
      }

      const cleanFromNumber = process.env.TWILIO_PHONE_NUMBER?.replace(/[^\d+]/g, '');
      const cleanToNumber = phoneNumber.replace(/[^\d+]/g, '');
      
      const toNumberFormats = [
        cleanToNumber,
        cleanToNumber.replace('+', ''),  
        cleanToNumber.startsWith('+91') ? cleanToNumber.slice(3) : 
          cleanToNumber.startsWith('+1') ? cleanToNumber.slice(2) : 
          cleanToNumber.replace('+', ''),
      ];
      
      console.log(`Jambonz SIP Enhanced: Trying formats for ${phoneNumber}:`, toNumberFormats);

      for (let i = 0; i < toNumberFormats.length; i++) {
        const toFormat = toNumberFormats[i];
        console.log(`Jambonz SIP attempt ${i + 1}: ${toFormat}`);
        
        try {
          const requestBody = {
            from: cleanFromNumber,
            to: toFormat,
            webhook: {
              url: `${process.env.NODE_ENV === 'development' 
                ? process.env.NGROK_URL 
                : process.env.NEXT_PUBLIC_APP_URL}/api/amd-events`,
              method: "POST",
            },
            amd: {
              enabled: true,
              thresholdWordCount: 5,
              timers: {
                decisionTimeoutMs: 10000,
                toneTimeoutMs: 20000,
                noSpeechTimeoutMs: 5000,
              },
              actionHook: `${process.env.NODE_ENV === 'development' 
                ? process.env.NGROK_URL 
                : process.env.NEXT_PUBLIC_APP_URL}/api/amd-events`,
            },
            sipTrunk: process.env.JAMBONZ_SIP_REALM ? {
              realm: process.env.JAMBONZ_SIP_REALM,
              username: process.env.JAMBONZ_SIP_USERNAME,
              password: process.env.JAMBONZ_SIP_PASSWORD,
            } : undefined,
          };

          const response = await fetch(`${process.env.JAMBONZ_API_BASE_URL}/v1/Accounts/${process.env.JAMBONZ_ACCOUNT_SID}/Calls`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${process.env.JAMBONZ_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(10000),
          });

          if (response.ok) {
            const data = await response.json();
            console.log(`Jambonz SIP success with format: ${toFormat}`);
            
            return {
              result: AmdResult.UNDECIDED,
              confidence: 0,
              metadata: {
                jambonzCallSid: data.sid,
                status: "initiated",
                phoneFormat: toFormat,
                provider: "jambonz",
                sipRouting: "enhanced",
                amdConfig: {
                  thresholdWordCount: 5,
                  decisionTimeoutMs: 10000,
                },
              },
            };
          } else {
            const errorText = await response.text();
            console.log(`Jambonz format ${toFormat} failed:`, errorText);
            
            if (i === toNumberFormats.length - 1) {
              console.log("All Jambonz formats failed, falling back to Twilio Native");
              return await this.fallbackToTwilio(phoneNumber, callId, `Jambonz rejected all formats: ${errorText}`);
            }
          }
        } catch (formatError) {
          console.log(`Jambonz format ${toFormat} exception:`, formatError);
        }
      }

      return await this.fallbackToTwilio(phoneNumber, callId, "All Jambonz phone number formats failed");

    } catch (error) {
      console.error("Jambonz call error:", error);
      return await this.fallbackToTwilio(phoneNumber, callId, error instanceof Error ? error.message : "Unknown error");
    }
  }

  private async checkJambonzAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${process.env.JAMBONZ_API_BASE_URL}/v1/health`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${process.env.JAMBONZ_API_KEY}`,
        },
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch (error) {
      console.log("Jambonz availability check failed:", error);
      return false;
    }
  }

  private async fallbackToTwilio(phoneNumber: string, callId: string, reason: string): Promise<AmdDetectionResult> {
    console.log(`Falling back to Twilio Native AMD. Reason: ${reason}`);
    
    const result = await this.twilioFallback.processCall(phoneNumber, callId);
    
    return {
      ...result,
      metadata: {
        ...result.metadata,
        fallbackReason: reason,
        originalProvider: "jambonz",
        actualProvider: "twilio",
        fallbackUsed: true,
      },
    };
  }

  async handleWebhook(payload: any): Promise<AmdDetectionResult | null> {
    const { amd_human_detected, amd_machine_detected, amd_decision_timeout } = payload;

    if (amd_human_detected) {
      return {
        result: AmdResult.HUMAN,
        confidence: 0.9,
        metadata: { jambonzAmd: "human_detected" },
      };
    }

    if (amd_machine_detected) {
      return {
        result: AmdResult.MACHINE,
        confidence: 0.85,
        metadata: { jambonzAmd: "machine_detected" },
      };
    }

    if (amd_decision_timeout) {
      return {
        result: AmdResult.TIMEOUT,
        confidence: 0.5,
        metadata: { jambonzAmd: "decision_timeout" },
      };
    }

    return null;
  }
}

export class HuggingFaceDetector implements AmdDetector {
  private twilioFallback: TwilioNativeDetector;

  constructor() {
    this.twilioFallback = new TwilioNativeDetector();
  }

  async processCall(phoneNumber: string, callId: string): Promise<AmdDetectionResult> {
    try {
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID!,
        process.env.TWILIO_AUTH_TOKEN!
      );

      const baseUrl = process.env.NODE_ENV === 'development' 
        ? process.env.NGROK_URL
        : process.env.NEXT_PUBLIC_APP_URL;

      const pythonServiceUrl = await this.ensurePythonServiceRunning();
      
      if (!pythonServiceUrl) {
        console.log("Python service unavailable, falling back to Twilio AMD");
        const fallbackResult = await this.twilioFallback.processCall(phoneNumber, callId);
        return {
          ...fallbackResult,
          metadata: {
            ...fallbackResult.metadata,
            strategy: "huggingface-fallback",
            fallbackReason: "Python service unavailable",
            originalStrategy: "huggingface"
          }
        };
      }

      const call = await client.calls.create({
        to: phoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER!,
        url: `${baseUrl}/api/webhooks/twilio/voice-stream`,
        statusCallback: `${baseUrl}/api/webhooks/twilio/status`,
        statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
        statusCallbackMethod: "POST",
        machineDetection: "Enable",
        machineDetectionTimeout: 30,
        machineDetectionSpeechThreshold: 2400,
        machineDetectionSpeechEndThreshold: 1200,
        machineDetectionSilenceTimeout: 5000,
        record: false,
      });

      return {
        result: AmdResult.UNDECIDED,
        confidence: 0,
        metadata: {
          twilioCallSid: call.sid,
          strategy: "huggingface",
          pythonService: pythonServiceUrl,
          streamingEnabled: true,
          model: "jakeBland/wav2vec-vm-finetune",
          analysisMethod: "real-time-streaming-ml",
        },
      };
    } catch (error) {
      console.error("HuggingFace detector error:", error);
      const fallbackResult = await this.twilioFallback.processCall(phoneNumber, callId);
      return {
        ...fallbackResult,
        metadata: {
          ...fallbackResult.metadata,
          strategy: "huggingface-error-fallback",
          originalError: error instanceof Error ? error.message : "Unknown error",
          originalStrategy: "huggingface"
        }
      };
    }
  }

  private async ensurePythonServiceRunning(): Promise<string | null> {
    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || "http://localhost:8000";
    
    try {
      const healthCheck = await fetch(`${pythonServiceUrl}/health`, { 
        signal: AbortSignal.timeout(3000) 
      });
      
      if (healthCheck.ok) {
        console.log("✅ Python ML service is ready for HuggingFace analysis");
        return pythonServiceUrl;
      } else {
        console.log("⚠️ Python ML service not responding, using fallback mode");
        return null;
      }
    } catch (error) {
      console.log("⚠️ Python ML service unavailable, using fallback mode");
      return null;
    }
  }

  async processAudioBuffer(audioBuffer: Buffer): Promise<AmdDetectionResult> {
    try {
      const response = await fetch(`${process.env.PYTHON_SERVICE_URL}/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
        },
        body: audioBuffer,
      });

      if (!response.ok) {
        throw new Error(`Python service error: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        result: data.label === "human" ? AmdResult.HUMAN : AmdResult.MACHINE,
        confidence: data.confidence,
        metadata: { 
          model: "jakeBland/wav2vec-vm-finetune",
          rawPrediction: data,
        },
      };
    } catch (error) {
      console.error("HuggingFace processing error:", error);
      return {
        result: AmdResult.ERROR,
        confidence: 0,
        metadata: { error: error instanceof Error ? error.message : "Unknown error" },
      };
    }
  }

  async handleWebhook(payload: any): Promise<AmdDetectionResult | null> {
    return await this.twilioFallback.handleWebhook(payload);
  }
}

export class GeminiFlashDetector implements AmdDetector {
  private genAI: GoogleGenerativeAI | null = null;
  private twilioFallback: TwilioNativeDetector;

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
    this.twilioFallback = new TwilioNativeDetector();
  }

  async processCall(phoneNumber: string, callId: string): Promise<AmdDetectionResult> {
    try {
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID!,
        process.env.TWILIO_AUTH_TOKEN!
      );

      // Use ngrok URL for local development
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? process.env.NGROK_URL
        : process.env.NEXT_PUBLIC_APP_URL;

      if (!process.env.GEMINI_API_KEY || !this.genAI) {
        console.log("Gemini API key not configured, falling back to Twilio AMD");
        const fallbackResult = await this.twilioFallback.processCall(phoneNumber, callId);
        return {
          ...fallbackResult,
          metadata: {
            ...fallbackResult.metadata,
            strategy: "gemini-fallback",
            fallbackReason: "Gemini API key not configured",
            originalStrategy: "gemini",
            note: "Get free API key from ai.google.dev"
          }
        };
      }

      const geminiAvailable = await this.testGeminiAvailability();
      
      if (!geminiAvailable) {
        console.log("Gemini API unavailable, falling back to Twilio AMD");
        const fallbackResult = await this.twilioFallback.processCall(phoneNumber, callId);
        return {
          ...fallbackResult,
          metadata: {
            ...fallbackResult.metadata,
            strategy: "gemini-api-fallback",
            fallbackReason: "Gemini API unavailable",
            originalStrategy: "gemini"
          }
        };
      }

      const call = await client.calls.create({
        to: phoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER!,
        url: `${baseUrl}/api/webhooks/twilio/voice-gemini`,
        statusCallback: `${baseUrl}/api/webhooks/twilio/status`,
        statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
        statusCallbackMethod: "POST",
        machineDetection: "Enable",
        machineDetectionTimeout: 30,
        machineDetectionSpeechThreshold: 2400,
        machineDetectionSpeechEndThreshold: 1200,
        machineDetectionSilenceTimeout: 5000,
        record: false,
      });

      return {
        result: AmdResult.UNDECIDED,
        confidence: 0,
        metadata: {
          twilioCallSid: call.sid,
          strategy: "gemini",
          geminiModel: "gemini-1.5-flash",
          streamingEnabled: true,
          analysisMethod: "multimodal-streaming-llm",
          costOptimized: true,
        },
      };
    } catch (error) {
      console.error("Gemini detector error:", error);
      // Fallback to Twilio AMD on any error
      const fallbackResult = await this.twilioFallback.processCall(phoneNumber, callId);
      return {
        ...fallbackResult,
        metadata: {
          ...fallbackResult.metadata,
          strategy: "gemini-error-fallback",
          originalError: error instanceof Error ? error.message : "Unknown error",
          originalStrategy: "gemini"
        }
      };
    }
  }

  private async testGeminiAvailability(): Promise<boolean> {
    try {
      if (!this.genAI) return false;
      
      const testModel = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const result = await testModel.generateContent("Hi");
      return !!result.response;
    } catch (error) {
      console.log("Gemini API test failed:", error);
      return false;
    }
  }

  async processAudioText(transcript: string, audioQuality?: string, noiseLevel?: string): Promise<AmdDetectionResult> {
    try {
      if (!this.genAI) {
        throw new Error("Gemini API not initialized");
      }

      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const isNoisyAudio = noiseLevel === "high" || audioQuality === "poor";
      const optimizedTranscript = transcript.length > 500 ? transcript.substring(0, 500) + "..." : transcript;
      
      const prompt = isNoisyAudio ? this.getFallbackPrompt(optimizedTranscript) : this.getStandardPrompt(optimizedTranscript, audioQuality, noiseLevel);

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      try {
        const parsed = JSON.parse(text);
        const amdResult = parsed.classification === "human" ? AmdResult.HUMAN : 
                         parsed.classification === "voicemail" ? AmdResult.VOICEMAIL : 
                         AmdResult.MACHINE;
        
        return {
          result: amdResult,
          confidence: parsed.confidence,
          metadata: {
            geminiResponse: parsed,
            transcript: optimizedTranscript,
            audioQuality,
            noiseLevel,
            promptType: isNoisyAudio ? "fallback" : "standard",
            tokenOptimized: transcript.length > 500,
          },
        };
      } catch (parseError) {
        console.error("Failed to parse Gemini response:", text);
        
        const fallbackResult = this.parseFallbackResponse(text);
        if (fallbackResult) {
          return fallbackResult;
        }
        
        return {
          result: AmdResult.ERROR,
          confidence: 0,
          metadata: { 
            error: "Failed to parse Gemini response", 
            rawResponse: text,
            fallbackAttempted: true 
          },
        };
      }
    } catch (error) {
      console.error("Gemini processing error:", error);
      return {
        result: AmdResult.ERROR,
        confidence: 0,
        metadata: { error: error instanceof Error ? error.message : "Unknown error" },
      };
    }
  }

  private getStandardPrompt(transcript: string, audioQuality?: string, noiseLevel?: string): string {
    return `
Analyze this phone call audio/transcript for AMD detection.

Audio characteristics:
- Quality: ${audioQuality || "unknown"}
- Background noise: ${noiseLevel || "unknown"}

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
  }

  private getFallbackPrompt(transcript: string): string {
    return `
AMD Analysis - Audio: noisy
Transcript: "${transcript}"
Human or Machine? JSON: {"type":"human|machine","conf":0.0-1.0}
    `;
  }

  private parseFallbackResponse(text: string): AmdDetectionResult | null {
    try {
      const lowerText = text.toLowerCase();
      
      if (lowerText.includes("human")) {
        return {
          result: AmdResult.HUMAN,
          confidence: 0.7,
          metadata: {
            fallbackParsing: true,
            rawResponse: text,
          },
        };
      } else if (lowerText.includes("machine") || lowerText.includes("voicemail")) {
        return {
          result: AmdResult.MACHINE,
          confidence: 0.7,
          metadata: {
            fallbackParsing: true,
            rawResponse: text,
          },
        };
      }
    } catch (error) {
      console.error("Fallback parsing failed:", error);
    }
    
    return null;
  }

  async handleWebhook(payload: any): Promise<AmdDetectionResult | null> {
    return await this.twilioFallback.handleWebhook(payload);
  }
}

export function createDetector(strategy: AmdStrategy): AmdDetector {
  switch (strategy) {
    case AmdStrategy.TWILIO_NATIVE:
      return new TwilioNativeDetector();
    case AmdStrategy.JAMBONZ_SIP:
      return new JambonzSipDetector();
    case AmdStrategy.HUGGINGFACE_MODEL:
      return new HuggingFaceDetector();
    case AmdStrategy.GEMINI_FLASH:
      return new GeminiFlashDetector();
    default:
      throw new Error(`Unsupported AMD strategy: ${strategy}`);
  }
}
