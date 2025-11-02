import { AmdStrategy, AmdResult } from "@prisma/client";
import { prisma } from "./prisma";

export interface PerformanceMetrics {
  strategy: AmdStrategy;
  totalCalls: number;
  successRate: number;
  averageResponseTime: number;
  averageCost: number;
  accuracyRate: number;
  fallbackRate?: number;
  errorRate: number;
  detectionBreakdown: {
    human: number;
    machine: number;
    timeout: number;
    error: number;
  };
}

export interface ComparisonAnalysis {
  jambonzMetrics: PerformanceMetrics;
  twilioMetrics: PerformanceMetrics;
  advantages: {
    jambonz: string[];
    twilio: string[];
  };
  recommendations: string[];
}

export class AmdPerformanceAnalyzer {
  
  async analyzeStrategy(strategy: AmdStrategy, dateRange?: { from: Date; to: Date }): Promise<PerformanceMetrics> {
    const whereClause: any = { amdStrategy: strategy };
    
    if (dateRange) {
      whereClause.createdAt = {
        gte: dateRange.from,
        lte: dateRange.to,
      };
    }

    const calls = await prisma.call.findMany({
      where: whereClause,
      select: {
        id: true,
        amdResult: true,
        confidence: true,
        duration: true,
        cost: true,
        createdAt: true,
        updatedAt: true,
        metadata: true,
      },
    });

    const totalCalls = calls.length;
    if (totalCalls === 0) {
      return this.getEmptyMetrics(strategy);
    }

    const responseTimes = calls
      .filter(call => call.updatedAt && call.createdAt)
      .map(call => call.updatedAt!.getTime() - call.createdAt.getTime());

    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length / 1000
      : 0;

    const costsWithValues = calls.filter(call => call.cost !== null).map(call => call.cost!);
    const averageCost = costsWithValues.length > 0 
      ? costsWithValues.reduce((sum, cost) => sum + cost, 0) / costsWithValues.length
      : 0;

    const successfulCalls = calls.filter(call => call.amdResult !== AmdResult.ERROR);
    const successRate = (successfulCalls.length / totalCalls) * 100;

    const errorCalls = calls.filter(call => call.amdResult === AmdResult.ERROR);
    const errorRate = (errorCalls.length / totalCalls) * 100;

    const detectionBreakdown = {
      human: calls.filter(call => call.amdResult === AmdResult.HUMAN).length,
      machine: calls.filter(call => call.amdResult === AmdResult.MACHINE).length,
      timeout: calls.filter(call => call.amdResult === AmdResult.TIMEOUT).length,
      error: errorCalls.length,
    };

    const callsWithGroundTruth = calls.filter(call => 
      call.metadata && 
      typeof call.metadata === 'object' && 
      'groundTruth' in call.metadata
    );
    
    let accuracyRate = 0;
    if (callsWithGroundTruth.length > 0) {
      const correctPredictions = callsWithGroundTruth.filter(call => {
        const metadata = call.metadata as any;
        return metadata.groundTruth === call.amdResult;
      });
      accuracyRate = (correctPredictions.length / callsWithGroundTruth.length) * 100;
    }

    let fallbackRate: number | undefined;
    if (strategy === AmdStrategy.JAMBONZ_SIP) {
      const fallbackCalls = calls.filter(call => 
        call.metadata && 
        typeof call.metadata === 'object' && 
        'fallbackUsed' in call.metadata &&
        (call.metadata as any).fallbackUsed === true
      );
      fallbackRate = (fallbackCalls.length / totalCalls) * 100;
    }

    return {
      strategy,
      totalCalls,
      successRate,
      averageResponseTime,
      averageCost,
      accuracyRate,
      fallbackRate,
      errorRate,
      detectionBreakdown,
    };
  }

  async compareStrategies(dateRange?: { from: Date; to: Date }): Promise<ComparisonAnalysis> {
    const [jambonzMetrics, twilioMetrics] = await Promise.all([
      this.analyzeStrategy(AmdStrategy.JAMBONZ_SIP, dateRange),
      this.analyzeStrategy(AmdStrategy.TWILIO_NATIVE, dateRange),
    ]);

    const advantages = this.calculateAdvantages(jambonzMetrics, twilioMetrics);
    const recommendations = this.generateRecommendations(jambonzMetrics, twilioMetrics);

    return {
      jambonzMetrics,
      twilioMetrics,
      advantages,
      recommendations,
    };
  }

  private calculateAdvantages(jambonz: PerformanceMetrics, twilio: PerformanceMetrics): {
    jambonz: string[];
    twilio: string[];
  } {
    const jambonzAdvantages: string[] = [];
    const twilioAdvantages: string[] = [];

    if (jambonz.averageResponseTime < twilio.averageResponseTime) {
      const improvement = ((twilio.averageResponseTime - jambonz.averageResponseTime) / twilio.averageResponseTime * 100).toFixed(1);
      jambonzAdvantages.push(`${improvement}% faster response time (${jambonz.averageResponseTime.toFixed(2)}s vs ${twilio.averageResponseTime.toFixed(2)}s)`);
    } else if (twilio.averageResponseTime < jambonz.averageResponseTime) {
      const improvement = ((jambonz.averageResponseTime - twilio.averageResponseTime) / jambonz.averageResponseTime * 100).toFixed(1);
      twilioAdvantages.push(`${improvement}% faster response time (${twilio.averageResponseTime.toFixed(2)}s vs ${jambonz.averageResponseTime.toFixed(2)}s)`);
    }

    if (jambonz.averageCost < twilio.averageCost) {
      const savings = ((twilio.averageCost - jambonz.averageCost) / twilio.averageCost * 100).toFixed(1);
      jambonzAdvantages.push(`${savings}% lower cost per call ($${jambonz.averageCost.toFixed(4)} vs $${twilio.averageCost.toFixed(4)})`);
    } else if (twilio.averageCost < jambonz.averageCost) {
      const savings = ((jambonz.averageCost - twilio.averageCost) / jambonz.averageCost * 100).toFixed(1);
      twilioAdvantages.push(`${savings}% lower cost per call ($${twilio.averageCost.toFixed(4)} vs $${jambonz.averageCost.toFixed(4)})`);
    }

    if (jambonz.accuracyRate > twilio.accuracyRate) {
      const improvement = (jambonz.accuracyRate - twilio.accuracyRate).toFixed(1);
      jambonzAdvantages.push(`${improvement}% higher accuracy rate (${jambonz.accuracyRate.toFixed(1)}% vs ${twilio.accuracyRate.toFixed(1)}%)`);
    } else if (twilio.accuracyRate > jambonz.accuracyRate) {
      const improvement = (twilio.accuracyRate - jambonz.accuracyRate).toFixed(1);
      twilioAdvantages.push(`${improvement}% higher accuracy rate (${twilio.accuracyRate.toFixed(1)}% vs ${jambonz.accuracyRate.toFixed(1)}%)`);
    }

    if (jambonz.successRate > twilio.successRate) {
      const improvement = (jambonz.successRate - twilio.successRate).toFixed(1);
      jambonzAdvantages.push(`${improvement}% higher success rate (${jambonz.successRate.toFixed(1)}% vs ${twilio.successRate.toFixed(1)}%)`);
    } else if (twilio.successRate > jambonz.successRate) {
      const improvement = (twilio.successRate - jambonz.successRate).toFixed(1);
      twilioAdvantages.push(`${improvement}% higher success rate (${twilio.successRate.toFixed(1)}% vs ${jambonz.successRate.toFixed(1)}%)`);
    }

    if (jambonz.fallbackRate !== undefined) {
      if (jambonz.fallbackRate < 10) {
        jambonzAdvantages.push(`Low fallback rate (${jambonz.fallbackRate.toFixed(1)}%) indicates reliable Jambonz service`);
      } else {
        jambonzAdvantages.push(`High fallback rate (${jambonz.fallbackRate.toFixed(1)}%) - consider Jambonz service optimization`);
      }
    }

    twilioAdvantages.push("Established service with proven reliability");
    twilioAdvantages.push("No additional infrastructure management required");

    return {
      jambonz: jambonzAdvantages,
      twilio: twilioAdvantages,
    };
  }

  private generateRecommendations(jambonz: PerformanceMetrics, twilio: PerformanceMetrics): string[] {
    const recommendations: string[] = [];

    if (jambonz.averageResponseTime < twilio.averageResponseTime && jambonz.successRate > 90) {
      recommendations.push("Consider using Jambonz as primary AMD strategy due to superior response time and reliability");
    }

    if (jambonz.averageCost < twilio.averageCost && jambonz.accuracyRate >= twilio.accuracyRate) {
      recommendations.push("Jambonz offers better cost efficiency without sacrificing accuracy");
    }

    if (jambonz.fallbackRate && jambonz.fallbackRate > 20) {
      recommendations.push("High fallback rate detected - investigate Jambonz service stability or network connectivity");
    }

    if (jambonz.errorRate > twilio.errorRate) {
      recommendations.push("Twilio shows lower error rates - consider improving Jambonz error handling");
    }

    if (jambonz.totalCalls < 100) {
      recommendations.push("Increase Jambonz test volume to get more reliable performance metrics");
    }

    if (Math.abs(jambonz.accuracyRate - twilio.accuracyRate) < 5) {
      recommendations.push("AMD accuracy is similar between strategies - prioritize cost and response time optimization");
    }

    recommendations.push("Monitor AMD parameters: thresholdWordCount=5, decisionTimeoutMs=10000 for optimal Jambonz performance");
    recommendations.push("Consider A/B testing with different AMD parameter configurations");
    recommendations.push("Implement ground truth labeling for more accurate performance measurement");

    return recommendations;
  }

  private getEmptyMetrics(strategy: AmdStrategy): PerformanceMetrics {
    return {
      strategy,
      totalCalls: 0,
      successRate: 0,
      averageResponseTime: 0,
      averageCost: 0,
      accuracyRate: 0,
      errorRate: 0,
      detectionBreakdown: {
        human: 0,
        machine: 0,
        timeout: 0,
        error: 0,
      },
    };
  }

  async generatePerformanceReport(dateRange?: { from: Date; to: Date }): Promise<string> {
    const comparison = await this.compareStrategies(dateRange);
    
    const report = `
# AMD Performance Analysis Report
Generated: ${new Date().toISOString()}
${dateRange ? `Date Range: ${dateRange.from.toISOString()} to ${dateRange.to.toISOString()}` : 'All Time'}

## Strategy Comparison

### Jambonz SIP-Enhanced (Strategy 2)
- **Total Calls**: ${comparison.jambonzMetrics.totalCalls}
- **Success Rate**: ${comparison.jambonzMetrics.successRate.toFixed(1)}%
- **Average Response Time**: ${comparison.jambonzMetrics.averageResponseTime.toFixed(2)}s
- **Average Cost**: $${comparison.jambonzMetrics.averageCost.toFixed(4)}
- **Accuracy Rate**: ${comparison.jambonzMetrics.accuracyRate.toFixed(1)}%
- **Error Rate**: ${comparison.jambonzMetrics.errorRate.toFixed(1)}%
${comparison.jambonzMetrics.fallbackRate !== undefined ? `- **Fallback Rate**: ${comparison.jambonzMetrics.fallbackRate.toFixed(1)}%` : ''}

### Twilio Native
- **Total Calls**: ${comparison.twilioMetrics.totalCalls}
- **Success Rate**: ${comparison.twilioMetrics.successRate.toFixed(1)}%
- **Average Response Time**: ${comparison.twilioMetrics.averageResponseTime.toFixed(2)}s
- **Average Cost**: $${comparison.twilioMetrics.averageCost.toFixed(4)}
- **Accuracy Rate**: ${comparison.twilioMetrics.accuracyRate.toFixed(1)}%
- **Error Rate**: ${comparison.twilioMetrics.errorRate.toFixed(1)}%

## Advantages

### Jambonz Advantages
${comparison.advantages.jambonz.map(adv => `- ${adv}`).join('\n')}

### Twilio Advantages
${comparison.advantages.twilio.map(adv => `- ${adv}`).join('\n')}

## Recommendations
${comparison.recommendations.map(rec => `- ${rec}`).join('\n')}

## Detection Breakdown

### Jambonz
- Human: ${comparison.jambonzMetrics.detectionBreakdown.human}
- Machine: ${comparison.jambonzMetrics.detectionBreakdown.machine}
- Timeout: ${comparison.jambonzMetrics.detectionBreakdown.timeout}
- Error: ${comparison.jambonzMetrics.detectionBreakdown.error}

### Twilio
- Human: ${comparison.twilioMetrics.detectionBreakdown.human}
- Machine: ${comparison.twilioMetrics.detectionBreakdown.machine}
- Timeout: ${comparison.twilioMetrics.detectionBreakdown.timeout}
- Error: ${comparison.twilioMetrics.detectionBreakdown.error}
`;

    return report;
  }
}
