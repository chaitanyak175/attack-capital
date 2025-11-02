import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  
  if (url.pathname.includes('zybTrackerStatisticsAction')) {
    const callback = url.searchParams.get('__callback__');
    if (callback) {
      return new NextResponse(`${callback}({})`, {
        status: 200,
        headers: {
          'Content-Type': 'application/javascript',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    return NextResponse.json({});
  }
  
  return NextResponse.json({});
}

export async function POST(request: NextRequest) {
  return NextResponse.json({});
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
