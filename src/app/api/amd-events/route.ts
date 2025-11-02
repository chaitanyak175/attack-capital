import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDetector } from "@/lib/amdStrategies";
import { AmdStrategy, CallStatus } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("Jambonz AMD Events Webhook:", JSON.stringify(body, null, 2));
    
    const amdFields = [
      'amd_human_detected', 'amd_machine_detected', 'amd_decision_timeout',
      'amd_result', 'answering_machine_detection', 'machine_detection_status',
      'amd_status', 'call_hook', 'hook_type'
    ];
    
    console.log("AMD-related fields in payload:");
    amdFields.forEach(field => {
      if (body.hasOwnProperty(field)) {
        console.log(`  ${field}: ${body[field]}`);
      }
    });

    const {
      call_sid,
      amd_human_detected,
      amd_machine_detected,
      amd_decision_timeout,
      call_status,
      call_duration,
      direction,
      from,
      to,
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
        amdStrategy: {
          in: [AmdStrategy.JAMBONZ_SIP, AmdStrategy.TWILIO_NATIVE],
        },
      },
    });

    if (!call) {
      console.log("Call not found for SID:", call_sid);
      return NextResponse.json({ 
        verb: "hangup",
        reason: "Call record not found"
      });
    }

    const detector = createDetector(call.amdStrategy);
    const result = await detector.handleWebhook?.(body);

    const mapJambonzStatus = (status: string): CallStatus => {
      switch (status) {
        case "trying":
        case "proceeding":
          return CallStatus.INITIATED;
        case "ringing":
          return CallStatus.RINGING;
        case "early":
        case "in-progress":
          return CallStatus.ANSWERED;
        case "completed":
          return CallStatus.COMPLETED;
        case "failed":
        case "busy":
        case "no-answer":
          return CallStatus.FAILED;
        case "canceled":
          return CallStatus.CANCELLED;
        default:
          return call.status;
      }
    };

    const newStatus = call_status ? mapJambonzStatus(call_status) : call.status;
    const duration = call_duration ? parseInt(call_duration) : null;
    
    const calculateCost = (durationSec: number, strategy: AmdStrategy): number => {
      if (strategy === AmdStrategy.JAMBONZ_SIP) {
        return (durationSec / 60) * 0.008;
      } else {
        return (durationSec / 60) * 0.0085;
      }
    };

    const cost = duration ? calculateCost(duration, call.amdStrategy) : null;

    const updateData: any = {
      status: newStatus,
      updatedAt: new Date(),
    };

    if (result) {
      updateData.amdResult = result.result;
      updateData.confidence = result.confidence;
      updateData.metadata = {
        ...call.metadata as any,
        ...result.metadata,
        lastWebhookReceived: new Date().toISOString(),
        provider: call.amdStrategy === AmdStrategy.JAMBONZ_SIP ? "jambonz" : "twilio",
      };
    }

    if (duration !== null) {
      updateData.duration = duration;
    }

    if (cost !== null) {
      updateData.cost = cost;
    }

    await prisma.call.update({
      where: { id: call.id },
      data: updateData,
    });

    console.log(`Updated call ${call.id}: status=${newStatus}, amdResult=${result?.result}, provider=${call.amdStrategy}`);

    if (amd_human_detected) {
      return NextResponse.json([
        {
          verb: "say",
          text: "Hello! Thank you for answering. This is a test call from Attack Capital's AMD system. You have been successfully identified as a human caller.",
          synthesizer: {
            vendor: "google",
            language: "en-US",
            voice: "en-US-Standard-A"
          }
        },
        {
          verb: "pause",
          length: 2
        },
        {
          verb: "say",
          text: "This call will now end. Have a great day!",
          synthesizer: {
            vendor: "google",
            language: "en-US",
            voice: "en-US-Standard-A"
          }
        },
        {
          verb: "hangup"
        }
      ]);
    } else if (amd_machine_detected) {
      console.log(`Machine detected for call ${call.id}, hanging up`);
      return NextResponse.json([
        {
          verb: "hangup",
          reason: "Answering machine detected"
        }
      ]);
    } else if (amd_decision_timeout) {
      return NextResponse.json([
        {
          verb: "say",
          text: "Hello, please say 'hello' to verify you are a human caller.",
          synthesizer: {
            vendor: "google",
            language: "en-US",
            voice: "en-US-Standard-A"
          }
        },
        {
          verb: "gather",
          input: ["speech"],
          speechTimeout: 3,
          speechModel: "default",
          webhook: {
            url: `${process.env.NODE_ENV === 'development' 
              ? process.env.NGROK_URL 
              : process.env.NEXT_PUBLIC_APP_URL}/api/amd-events/verify`,
            method: "POST"
          }
        }
      ]);
    } else {
      return NextResponse.json([
        {
          verb: "pause",
          length: 1
        },
        {
          verb: "say",
          text: "Hello?",
          synthesizer: {
            vendor: "google",
            language: "en-US",
            voice: "en-US-Standard-A"
          }
        }
      ]);
    }

  } catch (error) {
    console.error("AMD Events webhook error:", error);
    return NextResponse.json([
      {
        verb: "say",
        text: "Sorry, there was a technical error. Goodbye.",
        synthesizer: {
          vendor: "google",
          language: "en-US",
          voice: "en-US-Standard-A"
        }
      },
      {
        verb: "hangup",
        reason: "Technical error"
      }
    ], { status: 500 });
  }
}
