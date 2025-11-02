import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber } = await request.json();
    
    if (!phoneNumber) {
      return NextResponse.json({ error: "Phone number required" }, { status: 400 });
    }

    const cleanFromNumber = process.env.TWILIO_PHONE_NUMBER?.replace(/[^\d+]/g, '');
    const cleanToNumber = phoneNumber.replace(/[^\d+]/g, '');
    
    console.log(`🧪 DEBUG: Testing Jambonz call to ${phoneNumber}`);
    console.log(`From: ${cleanFromNumber}, To: ${cleanToNumber}`);

    const requestBody = {
      from: cleanFromNumber,
      to: cleanToNumber,
      webhook: {
        url: `${process.env.NODE_ENV === 'development' 
          ? process.env.NGROK_URL 
          : process.env.NEXT_PUBLIC_APP_URL}/api/debug/jambonz-webhooks`,
        method: "POST",
      },
      amd: {
        enabled: true,
        thresholdWordCount: 5,
        timers: {
          decisionTimeoutMs: 10000,
          toneTimeoutMs: 20000,
          noSpeechTimeoutMs: 5000,
        },
      },
    };

    console.log(`🧪 DEBUG: Request body:`, JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${process.env.JAMBONZ_API_BASE_URL}/v1/Accounts/${process.env.JAMBONZ_ACCOUNT_SID}/Calls`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.JAMBONZ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log(`🧪 DEBUG: Jambonz response status: ${response.status}`);
    console.log(`🧪 DEBUG: Jambonz response body: ${responseText}`);

    if (response.ok) {
      const data = JSON.parse(responseText);
      return NextResponse.json({
        success: true,
        message: "Debug call initiated successfully",
        jambonzCallSid: data.sid,
        debugWebhookUrl: `${process.env.NODE_ENV === 'development' 
          ? process.env.NGROK_URL 
          : process.env.NEXT_PUBLIC_APP_URL}/api/debug/jambonz-webhooks`,
        amdConfig: requestBody.amd,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: "Jambonz call failed",
        status: response.status,
        response: responseText,
      }, { status: response.status });
    }

  } catch (error) {
    console.error("Debug call error:", error);
    return NextResponse.json({
      success: false,
      error: "Debug call failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
