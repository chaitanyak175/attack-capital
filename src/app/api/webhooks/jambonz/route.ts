import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDetector } from "@/lib/amdStrategies";
import { AmdStrategy, CallStatus } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("Jambonz Webhook:", body);

    const {
      call_sid,
      amd_human_detected,
      amd_machine_detected,
      amd_decision_timeout,
      call_status,
      call_duration,
    } = body;

    const call = await prisma.call.findFirst({
      where: {
        metadata: {
          path: ["jambonzCallSid"],
          equals: call_sid,
        },
        amdStrategy: AmdStrategy.JAMBONZ_SIP,
      },
    });

    if (!call) {
      console.log("Call not found for Jambonz SID:", call_sid);
      return NextResponse.json({ status: "ok" });
    }

    const detector = createDetector(AmdStrategy.JAMBONZ_SIP);
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
    const cost = duration ? (duration / 60) * 0.01 : null;

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

    console.log(`Updated Jambonz call ${call.id}: status=${newStatus}, amdResult=${result?.result}`);

    if (amd_human_detected) {
      return NextResponse.json({
        verb: "say",
        text: "Hello! You have been verified as human. This is a test call.",
        synthesizer: {
          vendor: "google",
          language: "en-US",
          voice: "en-US-Standard-A"
        }
      });
    } else if (amd_machine_detected) {
      return NextResponse.json({
        verb: "hangup"
      });
    } else {
      return NextResponse.json({
        verb: "say",
        text: "Please say hello to verify you are human.",
        synthesizer: {
          vendor: "google",
          language: "en-US",
          voice: "en-US-Standard-A"
        }
      });
    }

  } catch (error) {
    console.error("Jambonz webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
