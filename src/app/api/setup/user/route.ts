import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    await prisma.user.deleteMany({
      where: {
        email: 'demo@attackcapital.com'
      }
    });

    const user = await prisma.user.create({
      data: {
        id: 'demo-user-id',
        email: 'demo@attackcapital.com',
        name: 'Demo User',
      }
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      }
    });

  } catch (error) {
    console.error("User setup error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return NextResponse.json({
      success: false,
      error: "Failed to create user",
      details: errorMessage,
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: 'demo-user-id'
      }
    });

    return NextResponse.json({
      exists: !!user,
      user: user ? {
        id: user.id,
        email: user.email,
        name: user.name,
      } : null
    });

  } catch (error) {
    console.error("User check error:", error);
    
    return NextResponse.json({
      exists: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
