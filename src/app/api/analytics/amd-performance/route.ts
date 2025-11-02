import { NextRequest, NextResponse } from "next/server";
import { AmdPerformanceAnalyzer } from "@/lib/amdPerformanceAnalyzer";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');
    const format = searchParams.get('format') || 'json';

    let dateRange: { from: Date; to: Date } | undefined;
    
    if (fromDate && toDate) {
      dateRange = {
        from: new Date(fromDate),
        to: new Date(toDate),
      };
    }

    const analyzer = new AmdPerformanceAnalyzer();

    if (format === 'markdown') {
      const report = await analyzer.generatePerformanceReport(dateRange);
      return new NextResponse(report, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': 'attachment; filename="amd-performance-report.md"',
        },
      });
    }

    const comparison = await analyzer.compareStrategies(dateRange);
    
    return NextResponse.json({
      success: true,
      data: comparison,
      metadata: {
        generatedAt: new Date().toISOString(),
        dateRange: dateRange ? {
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString(),
        } : null,
      },
    });

  } catch (error) {
    console.error("AMD performance analysis error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to generate performance analysis",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { strategy, dateRange } = body;

    const analyzer = new AmdPerformanceAnalyzer();
    
    if (strategy) {
      const metrics = await analyzer.analyzeStrategy(strategy, dateRange);
      return NextResponse.json({
        success: true,
        data: metrics,
      });
    } else {
      const comparison = await analyzer.compareStrategies(dateRange);
      return NextResponse.json({
        success: true,
        data: comparison,
      });
    }

  } catch (error) {
    console.error("AMD performance analysis error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to analyze AMD performance",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
