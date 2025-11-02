import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
) {
  try {
    const { callId } = await params;

    const call = await prisma.call.findFirst({
      where: {
        id: callId,
      },
    });

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    const getStatusMessage = (status: string, amdResult?: string) => {
      switch (status) {
        case "INITIATED":
          return "Call initiated, connecting...";
        case "RINGING":
          return "Phone is ringing...";
        case "ANSWERED":
          return "Call answered, analyzing audio...";
        case "COMPLETED":
          return amdResult === "HUMAN" 
            ? "Human detected - call connected!" 
            : amdResult === "MACHINE" || amdResult === "VOICEMAIL"
            ? "Voicemail/machine detected - call ended"
            : "Call completed";
        case "FAILED":
          return "Call failed";
        case "CANCELLED":
          return "Call cancelled";
        default:
          return "Processing...";
      }
    };

    return NextResponse.json({
      callId: call.id,
      status: call.status.toLowerCase(),
      amdResult: call.amdResult?.toLowerCase(),
      confidence: call.confidence,
      duration: call.duration,
      cost: call.cost,
      message: getStatusMessage(call.status, call.amdResult || undefined),
      createdAt: call.createdAt,
      updatedAt: call.updatedAt,
    });

  } catch (error) {
    console.error("Call status API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch call status" },
      { status: 500 }
    );
  }
}
