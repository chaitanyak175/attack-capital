import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const timestamp = new Date().toISOString();
    
    console.log(`\n=== JAMBONZ WEBHOOK DEBUG [${timestamp}] ===`);
    console.log("Full payload:", JSON.stringify(body, null, 2));
    console.log("Headers:", Object.fromEntries(request.headers.entries()));
    console.log("=== END WEBHOOK DEBUG ===\n");

    const amdFields = [
      'amd_human_detected',
      'amd_machine_detected', 
      'amd_decision_timeout',
      'amd_result',
      'answering_machine_detection',
      'machine_detection_status'
    ];

    const foundAmdFields = amdFields.filter(field => body.hasOwnProperty(field));
    
    if (foundAmdFields.length > 0) {
      console.log(`🎯 AMD Fields found: ${foundAmdFields.join(', ')}`);
      foundAmdFields.forEach(field => {
        console.log(`   ${field}: ${body[field]}`);
      });
    } else {
      console.log(`⚠️  No AMD fields found in payload`);
    }

    return NextResponse.json([
      {
        verb: "pause",
        length: 1
      },
      {
        verb: "say",
        text: "Debug webhook received. Checking AMD status.",
        synthesizer: {
          vendor: "google",
          language: "en-US",
          voice: "en-US-Standard-A"
        }
      }
    ]);

  } catch (error) {
    console.error("Debug webhook error:", error);
    return NextResponse.json([
      {
        verb: "hangup",
        reason: "Debug error"
      }
    ], { status: 500 });
  }
}
