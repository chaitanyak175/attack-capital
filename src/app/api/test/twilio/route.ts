import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

export async function GET(request: NextRequest) {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !phoneNumber) {
      return NextResponse.json({
        success: false,
        error: "Missing Twilio credentials",
        missing: {
          accountSid: !accountSid,
          authToken: !authToken,
          phoneNumber: !phoneNumber,
        }
      }, { status: 400 });
    }

    const client = twilio(accountSid, authToken);
    
    const account = await client.api.accounts(accountSid).fetch();
    
    const incomingPhoneNumbers = await client.incomingPhoneNumbers.list({
      phoneNumber: phoneNumber,
      limit: 1
    });

    return NextResponse.json({
      success: true,
      account: {
        sid: account.sid,
        friendlyName: account.friendlyName,
        status: account.status,
      },
      phoneNumber: {
        configured: phoneNumber,
        found: incomingPhoneNumbers.length > 0,
        details: incomingPhoneNumbers[0] ? {
          sid: incomingPhoneNumbers[0].sid,
          phoneNumber: incomingPhoneNumbers[0].phoneNumber,
          capabilities: incomingPhoneNumbers[0].capabilities,
        } : null
      },
      environment: {
        ngrokUrl: process.env.NGROK_URL,
        nodeEnv: process.env.NODE_ENV,
      }
    });

  } catch (error) {
    console.error("Twilio test error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return NextResponse.json({
      success: false,
      error: "Twilio API error",
      details: errorMessage,
      debug: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}
