import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const body = Object.fromEntries(formData.entries());
    
    console.log("Twilio Voice Stream Webhook:", body);

    const twiml = new VoiceResponse();

    const start = twiml.start();
    const wsUrl = process.env.NODE_ENV === 'development' 
      ? `wss://${process.env.NGROK_URL?.replace('https://', '')}/api/websocket/media-stream`
      : `wss://${request.headers.get('host')}/api/websocket/media-stream`;
      
    start.stream({
      url: wsUrl,
      track: 'inbound_track'
    });

    twiml.say({
      voice: "alice",
      language: "en-US"
    }, "Hello, please speak so we can verify you are human.");

    twiml.pause({ length: 5 });

    twiml.say("Thank you. Processing your response.");
    
    return new NextResponse(twiml.toString(), {
      headers: {
        "Content-Type": "text/xml",
      },
    });

  } catch (error) {
    console.error("Twilio voice stream webhook error:", error);
    
    const twiml = new VoiceResponse();
    twiml.hangup();
    
    return new NextResponse(twiml.toString(), {
      headers: {
        "Content-Type": "text/xml",
      },
    });
  }
}
