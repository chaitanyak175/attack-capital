import { NextRequest } from "next/server";
import { WebSocketServer } from "ws";
import { prisma } from "@/lib/prisma";
import { AmdResult } from "@prisma/client";


interface MediaMessage {
  event: string;
  streamSid?: string;
  callSid?: string;
  media?: {
    payload: string;
    timestamp: string;
  };
}

interface AudioBuffer {
  chunks: Buffer[];
  timestamp: number;
  callSid: string;
}

const activeStreams = new Map<string, AudioBuffer>();

async function processAudioChunk(callSid: string, audioData: Buffer): Promise<void> {
  try {
    const call = await prisma.call.findFirst({
      where: {
        metadata: {
          path: ["twilioCallSid"],
          equals: callSid,
        },
      },
    });

    if (!call) {
      console.log(`Call not found for SID: ${callSid}`);
      return;
    }

    let amdResult: AmdResult | null = null;
    let confidence = 0;
    let metadata: any = {};

    if (call.amdStrategy === "HUGGINGFACE_MODEL") {
      const result = await processWithHuggingFace(audioData);
      if (result) {
        amdResult = result.label === "human" ? AmdResult.HUMAN : AmdResult.MACHINE;
        confidence = result.confidence;
        metadata = {
          ...call.metadata as any,
          huggingFaceResult: result,
          processingTime: result.processing_time_ms,
        };
      }
    } else if (call.amdStrategy === "GEMINI_FLASH") {
      const result = await processWithGemini(audioData);
      if (result) {
        amdResult = result.result;
        confidence = result.confidence;
        metadata = {
          ...call.metadata as any,
          geminiResult: result.metadata,
        };
      }
    }

    if (amdResult) {
      await prisma.call.update({
        where: { id: call.id },
        data: {
          amdResult,
          confidence,
          metadata,
          updatedAt: new Date(),
        },
      });

      console.log(`🎯 Real-time AMD result: ${amdResult} (confidence: ${confidence}) for call ${call.id}`);
    }

  } catch (error) {
    console.error("Error processing audio chunk:", error);
  }
}

async function processWithHuggingFace(audioData: Buffer): Promise<any> {
  try {
    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL;
    if (!pythonServiceUrl) {
      throw new Error("Python service URL not configured");
    }

    const formData = new FormData();
    const audioBlob = new Blob([audioData], { type: "audio/wav" });
    formData.append("file", audioBlob, "audio.wav");

    const response = await fetch(`${pythonServiceUrl}/predict-stream`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Python service error: ${response.statusText}`);
    }

    return await response.json();

  } catch (error) {
    console.error("HuggingFace processing error:", error);
    return null;
  }
}

async function processWithGemini(audioData: Buffer): Promise<any> {
  try {
    const audioBase64 = audioData.toString('base64');
    
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Analyze this audio data to determine if it's from a human speaker or an answering machine/voicemail.
      
      Audio data (base64): ${audioBase64.substring(0, 100)}...
      
      Consider:
      - Human speech patterns vs. recorded messages
      - Interactive responses vs. scripted content
      - Background noise and audio quality
      
      Respond with JSON only:
      {
        "classification": "human" | "machine" | "voicemail",
        "confidence": 0.0-1.0,
        "reasoning": "brief explanation"
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    try {
      const parsed = JSON.parse(text);
      return {
        result: parsed.classification === "human" ? AmdResult.HUMAN : AmdResult.MACHINE,
        confidence: parsed.confidence,
        metadata: {
          geminiResponse: parsed,
          audioLength: audioData.length,
        },
      };
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", text);
      return null;
    }

  } catch (error) {
    console.error("Gemini processing error:", error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  
  return new Response("WebSocket endpoint - use WebSocket client", {
    status: 426,
    headers: {
      "Upgrade": "websocket",
    },
  });
}

export function handleWebSocketMessage(ws: any, message: string) {
  try {
    const data: MediaMessage = JSON.parse(message);
    
    switch (data.event) {
      case "start":
        console.log(`Media stream started: ${data.streamSid} for call ${data.callSid}`);
        if (data.callSid) {
          activeStreams.set(data.streamSid!, {
            chunks: [],
            timestamp: Date.now(),
            callSid: data.callSid,
          });
        }
        break;

      case "media":
        if (data.streamSid && data.media) {
          const stream = activeStreams.get(data.streamSid);
          if (stream) {
            const audioChunk = Buffer.from(data.media.payload, 'base64');
            stream.chunks.push(audioChunk);
            
            const bufferDuration = stream.chunks.length * 20;
            if (bufferDuration >= 2000) {
              const audioBuffer = Buffer.concat(stream.chunks);
              processAudioChunk(stream.callSid, audioBuffer);
              
              stream.chunks = [];
              stream.timestamp = Date.now();
            }
          }
        }
        break;

      case "stop":
        console.log(`Media stream stopped: ${data.streamSid}`);
        if (data.streamSid) {
          const stream = activeStreams.get(data.streamSid);
          if (stream && stream.chunks.length > 0) {
            const audioBuffer = Buffer.concat(stream.chunks);
            processAudioChunk(stream.callSid, audioBuffer);
          }
          activeStreams.delete(data.streamSid);
        }
        break;
    }

  } catch (error) {
    console.error("WebSocket message handling error:", error);
  }
}

export { handleWebSocketMessage as websocketHandler };
