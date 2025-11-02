import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createDetector } from "@/lib/amdStrategies";
import { AmdStrategy, CallStatus } from "@prisma/client";
import { z } from "zod";
import { formatPhoneNumber, isValidPhoneNumber } from "@/lib/phoneUtils";

const dialSchema = z.object({
  phoneNumber: z.string().min(7, "Phone number must be at least 7 digits").refine(
    (phone) => isValidPhoneNumber(phone),
    "Invalid phone number format"
  ),
  amdStrategy: z.nativeEnum(AmdStrategy),
});

export async function POST(request: NextRequest) {
  try {
    const requiredEnvVars = {
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
      TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
      NGROK_URL: process.env.NGROK_URL,
    };

    const missingVars = Object.entries(requiredEnvVars)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    if (missingVars.length > 0) {
      console.error("Missing environment variables:", missingVars);
      return NextResponse.json(
        { 
          error: "Server configuration error", 
          details: `Missing environment variables: ${missingVars.join(", ")}` 
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { phoneNumber, amdStrategy } = dialSchema.parse(body);

    const formattedPhoneNumber = formatPhoneNumber(phoneNumber);

    const call = await prisma.call.create({
      data: {
        targetNumber: formattedPhoneNumber,
        amdStrategy,
        status: CallStatus.INITIATED,
      },
    });

    const detector = createDetector(amdStrategy);
    
    const result = await detector.processCall(formattedPhoneNumber, call.id);

    await prisma.call.update({
      where: { id: call.id },
      data: {
        amdResult: result.result,
        confidence: result.confidence,
        metadata: result.metadata,
        status: result.result === "ERROR" ? CallStatus.FAILED : CallStatus.INITIATED,
        errorMessage: result.result === "ERROR" ? (result.metadata?.error as string) : null,
      },
    });

    if (result.result === "ERROR") {
      return NextResponse.json({
        callId: call.id,
        status: "failed",
        amdStrategy,
        error: result.metadata?.error || "Call failed",
        message: result.metadata?.error || "Call failed to initiate",
      });
    }

    return NextResponse.json({
      callId: call.id,
      status: "initiated",
      amdStrategy,
      message: "Call initiated successfully",
    });

  } catch (error) {
    console.error("Dial API error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error("Detailed error:", {
      message: errorMessage,
      stack: errorStack,
      type: typeof error,
      error: error
    });

    return NextResponse.json(
      { 
        error: "Failed to initiate call", 
        details: errorMessage,
        debug: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 }
    );
  }
}
