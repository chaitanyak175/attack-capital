import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AmdResult } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("Jambonz Speech Verification:", body);

    const {
      call_sid,
      speech,
      confidence,
    } = body;

    const call = await prisma.call.findFirst({
      where: {
        OR: [
          {
            metadata: {
              path: ["jambonzCallSid"],
              equals: call_sid,
            },
          },
          {
            metadata: {
              path: ["twilioCallSid"],
              equals: call_sid,
            },
          },
        ],
      },
    });

    if (!call) {
      console.log("Call not found for verification SID:", call_sid);
      return NextResponse.json([
        {
          verb: "hangup",
          reason: "Call record not found"
        }
      ]);
    }

    const isHumanResponse = (speechText: string): boolean => {
      if (!speechText) return false;
      
      const text = speechText.toLowerCase().trim();
      const humanKeywords = [
        "hello", "hi", "hey", "yes", "yeah", "yep", "speaking", 
        "this is", "what", "who", "how", "why", "okay", "ok"
      ];
      
      return humanKeywords.some(keyword => text.includes(keyword)) || 
             text.length > 2;
    };

    let amdResult: AmdResult;
    let responseConfidence: number;
    let responseAction: any[];

    if (speech && isHumanResponse(speech)) {
      amdResult = AmdResult.HUMAN;
      responseConfidence = Math.max(0.8, confidence || 0.8);
      
      responseAction = [
        {
          verb: "say",
          text: "Thank you for verifying. You have been confirmed as a human caller.",
          synthesizer: {
            vendor: "google",
            language: "en-US",
            voice: "en-US-Standard-A"
          }
        },
        {
          verb: "hangup"
        }
      ];
    } else {
      amdResult = AmdResult.MACHINE;
      responseConfidence = 0.7;
      
      responseAction = [
        {
          verb: "hangup",
          reason: "No human verification received"
        }
      ];
    }

    await prisma.call.update({
      where: { id: call.id },
      data: {
        amdResult,
        confidence: responseConfidence,
        metadata: {
          ...call.metadata as any,
          speechVerification: {
            speech: speech || "no_speech",
            confidence: confidence || 0,
            verifiedAt: new Date().toISOString(),
            result: amdResult,
          },
        },
        updatedAt: new Date(),
      },
    });

    console.log(`Speech verification for call ${call.id}: ${amdResult} (speech: "${speech}")`);

    return NextResponse.json(responseAction);

  } catch (error) {
    console.error("Speech verification error:", error);
    return NextResponse.json([
      {
        verb: "say",
        text: "Verification failed. Goodbye.",
        synthesizer: {
          vendor: "google",
          language: "en-US",
          voice: "en-US-Standard-A"
        }
      },
      {
        verb: "hangup",
        reason: "Verification error"
      }
    ], { status: 500 });
  }
}
