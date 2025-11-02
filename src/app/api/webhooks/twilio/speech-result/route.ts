import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GeminiFlashDetector } from "@/lib/amdStrategies";
import { AmdStrategy, CallStatus } from "@prisma/client";
import twilio from "twilio";

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const body = Object.fromEntries(formData.entries());
    
    console.log("Twilio Speech Result Webhook:", body);

    const {
      CallSid,
      SpeechResult,
      Confidence: speechConfidence,
    } = body;

    const twiml = new VoiceResponse();

    const call = await prisma.call.findFirst({
      where: {
        metadata: {
          path: ["twilioCallSid"],
          equals: CallSid as string,
        },
        amdStrategy: AmdStrategy.GEMINI_FLASH,
      },
    });

    if (!call) {
      console.log("Call not found for Gemini processing:", CallSid);
      twiml.say("Call processing error.");
      twiml.hangup();
      return new NextResponse(twiml.toString(), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    if (SpeechResult) {
      const detector = new GeminiFlashDetector();
      const result = await detector.processAudioText(SpeechResult as string);

      await prisma.call.update({
        where: { id: call.id },
        data: {
          amdResult: result.result,
          confidence: result.confidence,
          metadata: {
            ...call.metadata as any,
            ...result.metadata,
            speechResult: SpeechResult,
            speechConfidence: speechConfidence,
          },
          status: CallStatus.ANSWERED,
        },
      });

      if (result.result === "HUMAN") {
        twiml.say({
          voice: "alice",
          language: "en-US"
        }, "Great! You have been verified as human. This is a test call from our AMD system.");
        
        twiml.pause({ length: 2 });
        twiml.say("Thank you for participating in our test. Goodbye!");
        
      } else {
        twiml.say("Voicemail or automated system detected. Ending call.");
        twiml.hangup();
      }

    } else {
      await prisma.call.update({
        where: { id: call.id },
        data: {
          amdResult: "TIMEOUT",
          confidence: 0.3,
          metadata: {
            ...call.metadata as any,
            error: "No speech detected",
          },
          status: CallStatus.COMPLETED,
        },
      });

      twiml.say("No speech detected. Treating as voicemail.");
      twiml.hangup();
    }

    return new NextResponse(twiml.toString(), {
      headers: {
        "Content-Type": "text/xml",
      },
    });

  } catch (error) {
    console.error("Speech result webhook error:", error);
    
    const twiml = new VoiceResponse();
    twiml.say("Processing error occurred.");
    twiml.hangup();
    
    return new NextResponse(twiml.toString(), {
      headers: {
        "Content-Type": "text/xml",
      },
    });
  }
}
