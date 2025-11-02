import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDetector } from "@/lib/amdStrategies";
import { CallStatus, AmdStrategy } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const body = Object.fromEntries(formData.entries());
    
    console.log("Twilio Status Webhook:", body);

    const {
      CallSid,
      CallStatus: twilioStatus,
      AnsweringMachineDetectionStatus,
      AnsweredBy,
      CallDuration,
    } = body;

    const call = await prisma.call.findFirst({
      where: {
        metadata: {
          path: ["twilioCallSid"],
          equals: CallSid as string,
        },
      },
    });

    if (!call) {
      console.log("Call not found for SID:", CallSid);
      return NextResponse.json({ status: "ok" });
    }

    const mapTwilioStatus = (status: string): CallStatus => {
      switch (status) {
        case "queued":
        case "initiated":
          return CallStatus.INITIATED;
        case "ringing":
          return CallStatus.RINGING;
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
          return CallStatus.INITIATED;
      }
    };

    const newStatus = mapTwilioStatus(twilioStatus as string);
    const duration = CallDuration ? parseInt(CallDuration as string) : null;

    const cost = duration ? (duration / 60) * 0.0085 : null;

    let amdResult = call.amdResult;
    let confidence = call.confidence;
    let metadata = (call.metadata as Record<string, any>) || {};

    if (AnsweringMachineDetectionStatus || AnsweredBy) {
      
      const detector = createDetector(AmdStrategy.TWILIO_NATIVE);
      
      const amdPayload = {
        ...body,
        AnsweringMachineDetectionStatus: AnsweringMachineDetectionStatus || AnsweredBy,
      };
      
      const result = await detector.handleWebhook?.(amdPayload);
      
      if (result) {
        amdResult = result.result;
        confidence = result.confidence;
        metadata = { 
          ...metadata, 
          ...result.metadata,
          originalAnsweredBy: AnsweredBy,
          originalStrategy: call.amdStrategy,
          actualProvider: "twilio",
          fallbackUsed: call.amdStrategy !== AmdStrategy.TWILIO_NATIVE,
        };
        
        console.log(`🎯 AMD result processed: ${amdResult} (confidence: ${confidence}) from ${AnsweredBy || AnsweringMachineDetectionStatus} [Strategy: ${call.amdStrategy}]`);
      }
    } else {
      console.log(`⚠️  No AMD fields found in webhook for call ${call.id} [Strategy: ${call.amdStrategy}]`);
    }

    await prisma.call.update({
      where: { id: call.id },
      data: {
        status: newStatus,
        amdResult,
        confidence,
        duration,
        cost,
        metadata,
        updatedAt: new Date(),
      },
    });

    console.log(`Updated call ${call.id}: status=${newStatus}, amdResult=${amdResult}, duration=${duration}s`);

    return NextResponse.json({ status: "ok" });

  } catch (error) {
    console.error("Twilio status webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
