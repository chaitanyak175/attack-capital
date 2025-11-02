import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const body = Object.fromEntries(formData.entries());
    
    console.log("Twilio Voice Gemini Webhook:", body);

    const twiml = new VoiceResponse();

    const gather = twiml.gather({
      speechTimeout: 'auto',
      speechModel: 'experimental_conversations',
      enhanced: true,
      action: `${process.env.NODE_ENV === 'development' 
        ? process.env.NGROK_URL
        : process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/speech-result`,
      method: 'POST',
      input: ['speech'],
      timeout: 10,
    });

    gather.say({
      voice: "alice",
      language: "en-US"
    }, "Hello, please say something so we can verify you are human.");

    twiml.say("No response detected. Treating as voicemail.");
    twiml.hangup();
    
    return new NextResponse(twiml.toString(), {
      headers: {
        "Content-Type": "text/xml",
      },
    });

  } catch (error) {
    console.error("Twilio voice Gemini webhook error:", error);
    
    const twiml = new VoiceResponse();
    twiml.hangup();
    
    return new NextResponse(twiml.toString(), {
      headers: {
        "Content-Type": "text/xml",
      },
    });
  }
}
