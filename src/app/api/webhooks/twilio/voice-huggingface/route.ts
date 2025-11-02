import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const body = Object.fromEntries(formData.entries());
    
    console.log("Twilio Voice HuggingFace Webhook:", body);

    const twiml = new VoiceResponse();

    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || "http://localhost:8000";
    
    try {
      const healthCheck = await fetch(`${pythonServiceUrl}/health`, { 
        signal: AbortSignal.timeout(2000) 
      });
      
      if (healthCheck.ok) {
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
        }, "Hello, please speak so we can analyze your voice with our AI model.");

        twiml.pause({ length: 5 });
        twiml.say("Thank you. Our HuggingFace model is processing your response.");
        
      } else {
        throw new Error("Python service unavailable");
      }
      
    } catch (error) {
      console.log("Python service unavailable, using recording analysis fallback");
      
      twiml.say({
        voice: "alice",
        language: "en-US"
      }, "Hello, please speak clearly for voice analysis.");
      
      twiml.record({
        timeout: 10,
        maxLength: 30,
        action: `${process.env.NODE_ENV === 'development' 
          ? process.env.NGROK_URL
          : process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/recording-analysis`,
        method: 'POST',
        recordingStatusCallback: `${process.env.NODE_ENV === 'development' 
          ? process.env.NGROK_URL
          : process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/recording-analysis`,
        recordingStatusCallbackMethod: 'POST'
      });
      
      twiml.say("Thank you. Analyzing your response with HuggingFace-style pattern recognition.");
    }
    
    return new NextResponse(twiml.toString(), {
      headers: {
        "Content-Type": "text/xml",
      },
    });

  } catch (error) {
    console.error("Twilio voice HuggingFace webhook error:", error);
    
    const twiml = new VoiceResponse();
    twiml.say("Voice analysis error occurred.");
    twiml.hangup();
    
    return new NextResponse(twiml.toString(), {
      headers: {
        "Content-Type": "text/xml",
      },
    });
  }
}
