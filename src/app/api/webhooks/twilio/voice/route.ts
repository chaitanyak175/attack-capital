import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const body = Object.fromEntries(formData.entries());
    
    console.log("Twilio Voice Webhook:", body);

    const twiml = new VoiceResponse();

    const amdStatus = body.AnsweringMachineDetectionStatus as string;
    
    if (amdStatus === "human") {
      twiml.say({
        voice: "alice",
        language: "en-US"
      }, "Hello! This is a test call from the AMD system. You have been identified as a human. Thank you!");
      
      twiml.pause({ length: 2 });
      twiml.say("This call will now end. Goodbye!");
      
    } else if (amdStatus && amdStatus.startsWith("machine")) {
      twiml.say({
        voice: "alice",
        language: "en-US"
      }, "Voicemail detected. Hanging up.");
      twiml.hangup();
      
    } else {
      twiml.say({
        voice: "alice",
        language: "en-US"
      }, "Hello, please say something so we can verify you are human.");
      
      twiml.pause({ length: 3 });
      twiml.say("Thank you for your response. This call will now end.");
    }

    return new NextResponse(twiml.toString(), {
      headers: {
        "Content-Type": "text/xml",
      },
    });

  } catch (error) {
    console.error("Twilio voice webhook error:", error);
    
    const twiml = new VoiceResponse();
    twiml.hangup();
    
    return new NextResponse(twiml.toString(), {
      headers: {
        "Content-Type": "text/xml",
      },
    });
  }
}
