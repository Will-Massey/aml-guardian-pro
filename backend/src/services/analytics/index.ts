import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';

interface RiskPrediction {
  clientId: string;
  currentRisk: string;
  predictedRisk: string;
  probability: number;
  factors: {
    name: string;
    weight: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  }[];
  recommendedActions: string[];
}

interface AnomalyDetection {
  clientId: string;
  anomalyType: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  detectedAt: Date;
}

/**
 * Analyze client for risk prediction
 */
export async function predictClientRisk(clientId: string): Promise<RiskPrediction | null> {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        riskAssessment: true,
        documents: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!client || !client.riskAssessment) {
      return null;
    }

    const factors: RiskPrediction['factors'] = [];
    let riskScore = client.riskAssessment.riskScore;
    let daysUntilReview: number | undefined = undefined;

    // Factor 1: Document submission velocity
    const recentDocuments = client.documents.filter(
      d => d.createdAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length;
    
    if (recentDocuments > 5) {
      factors.push({
        name: 'High document activity',
        weight: 0.15,
        trend: 'increasing',
      });
      riskScore += 5;
    }

    // Factor 2: Document verification delays
    const pendingDocs = client.documents.filter(d => d.status === 'PENDING_VERIFICATION').length;
    if (pendingDocs > 2) {
      factors.push({
        name: 'Verification delays',
        weight: 0.2,
        trend: 'increasing',
      });
      riskScore += 8;
    }

    // Factor 3: Company age (newer = higher risk)
    if (client.incorporationDate) {
      const companyAge = Date.now() - new Date(client.incorporationDate).getTime();
      const ageInMonths = companyAge / (1000 * 60 * 60 * 24 * 30);
      
      if (ageInMonths < 6) {
        factors.push({
          name: 'Recently incorporated',
          weight: 0.25,
          trend: 'stable',
        });
        riskScore += 10;
      }
    }

    // Factor 4: Review approaching
    if (client.nextReviewDate) {
      daysUntilReview = Math.ceil(
        (new Date(client.nextReviewDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysUntilReview < 30 && daysUntilReview > 0) {
        factors.push({
          name: 'Review due soon',
          weight: 0.1,
          trend: 'increasing',
        });
      }
    }

    // Factor 5: Risk assessment age
    const assessmentAge = Date.now() - new Date(client.riskAssessment.aiGeneratedAt).getTime();
    const assessmentAgeInMonths = assessmentAge / (1000 * 60 * 60 * 24 * 30);
    
    if (assessmentAgeInMonths > 12) {
      factors.push({
        name: 'Outdated risk assessment',
        weight: 0.2,
        trend: 'increasing',
      });
      riskScore += 10;
    }

    // Calculate predicted risk level
    let predictedRisk = client.riskLevel;
    let probability = 0.3;

    if (riskScore > 70) {
      predictedRisk = 'HIGH';
      probability = Math.min((riskScore - 70) / 30, 1);
    } else if (riskScore > 40) {
      predictedRisk = 'MEDIUM';
      probability = Math.min((riskScore - 40) / 30, 1);
    } else {
      predictedRisk = 'LOW';
      probability = Math.min((40 - riskScore) / 40, 1);
    }

    // Generate recommendations
    const recommendedActions: string[] = [];
    
    if (pendingDocs > 0) {
      recommendedActions.push('Verify pending documents immediately');
    }
    
    if (assessmentAgeInMonths > 12) {
      recommendedActions.push('Regenerate risk assessment with current data');
    }
    
    if (daysUntilReview && daysUntilReview < 30) {
      recommendedActions.push('Schedule CDD review meeting');
    }
    
    if (client.riskLevel === 'HIGH') {
      recommendedActions.push('Conduct enhanced due diligence check');
    }

    return {
      clientId,
      currentRisk: client.riskLevel,
      predictedRisk,
      probability,
      factors,
      recommendedActions,
    };
  } catch (error) {
    logger.error('Risk prediction failed', { clientId, error });
    return null;
  }
}

/**
 * Detect anomalies across all clients
 */
export async function detectAnomalies(userId: string): Promise<AnomalyDetection[]> {
  try {
    const anomalies: AnomalyDetection[] = [];

    // Get all clients for user
    const clients = await prisma.client.findMany({
      where: { userId },
      include: {
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        riskAssessment: true,
      },
    });

    for (const client of clients) {
      // Anomaly 1: Sudden spike in document uploads
      const last7Days = client.documents.filter(
        d => d.createdAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length;
      
      const previous7Days = client.documents.filter(
        d => {
          const age = Date.now() - new Date(d.createdAt).getTime();
          return age > 7 * 24 * 60 * 60 * 1000 && age < 14 * 24 * 60 * 60 * 1000;
        }
      ).length;

      if (last7Days > previous7Days * 3 && last7Days > 3) {
        anomalies.push({
          clientId: client.id,
          anomalyType: 'document_spike',
          severity: 'medium',
          description: `Unusual spike in document uploads (${last7Days} in last 7 days)`,
          detectedAt: new Date(),
        });
      }

      // Anomaly 2: High-risk client with no recent activity
      if (client.riskLevel === 'HIGH') {
        const lastActivity = client.documents[0]?.createdAt || client.updatedAt;
        const daysSinceActivity = Math.floor(
          (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceActivity > 30) {
          anomalies.push({
            clientId: client.id,
            anomalyType: 'high_risk_inactive',
            severity: 'high',
            description: `High-risk client inactive for ${daysSinceActivity} days`,
            detectedAt: new Date(),
          });
        }
      }

      // Anomaly 3: Missing required documents
      const requiredDocTypes = ['ID_VERIFICATION', 'ADDRESS_VERIFICATION'];
      const hasRequiredDocs = requiredDocTypes.every(type =>
        client.documents.some(d => d.type === type && d.status === 'VERIFIED')
      );

      if (!hasRequiredDocs && client.createdAt < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
        anomalies.push({
          clientId: client.id,
          anomalyType: 'missing_documents',
          severity: 'medium',
          description: 'Required verification documents still pending after 7 days',
          detectedAt: new Date(),
        });
      }
    }

    return anomalies.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  } catch (error) {
    logger.error('Anomaly detection failed', { userId, error });
    return [];
  }
}

/**
 * Get compliance trends over time
 */
export async function getComplianceTrends(
  userId: string,
  months: number = 6
): Promise<{
  month: string;
  totalClients: number;
  compliantClients: number;
  highRiskClients: number;
  newClients: number;
}[]> {
  try {
    const trends: any[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);

      const [
        totalClients,
        compliantClients,
        highRiskClients,
        newClients,
      ] = await Promise.all([
        prisma.client.count({
          where: {
            userId,
            createdAt: { lte: monthEnd },
          },
        }),
        prisma.client.count({
          where: {
            userId,
            createdAt: { lte: monthEnd },
            identityVerified: true,
            addressVerified: true,
          },
        }),
        prisma.client.count({
          where: {
            userId,
            riskLevel: 'HIGH',
            createdAt: { lte: monthEnd },
          },
        }),
        prisma.client.count({
          where: {
            userId,
            createdAt: {
              gte: monthStart,
              lt: monthEnd,
            },
          },
        }),
      ]);

      trends.push({
        month: monthStart.toLocaleString('en-GB', { month: 'short', year: 'numeric' }),
        totalClients,
        compliantClients,
        highRiskClients,
        newClients,
      });
    }

    return trends;
  } catch (error) {
    logger.error('Compliance trends failed', { userId, error });
    return [];
  }
}

/**
 * Get risk score distribution analysis
 */
export async function getRiskScoreDistribution(userId: string): Promise<{
  scoreRanges: { range: string; count: number; percentage: number }[];
  averageScore: number;
  medianScore: number;
}> {
  try {
    const riskAssessments = await prisma.riskAssessment.findMany({
      where: {
        client: { userId },
      },
      select: {
        riskScore: true,
      },
    });

    const scores = riskAssessments.map(r => r.riskScore);
    
    if (scores.length === 0) {
      return {
        scoreRanges: [],
        averageScore: 0,
        medianScore: 0,
      };
    }

    // Calculate ranges
    const ranges = [
      { range: '0-25 (Low)', min: 0, max: 25, count: 0 },
      { range: '26-50 (Medium)', min: 26, max: 50, count: 0 },
      { range: '51-75 (High)', min: 51, max: 75, count: 0 },
      { range: '76-100 (Critical)', min: 76, max: 100, count: 0 },
    ];

    scores.forEach(score => {
      const range = ranges.find(r => score >= r.min && score <= r.max);
      if (range) range.count++;
    });

    const total = scores.length;
    const scoreRanges = ranges.map(r => ({
      range: r.range,
      count: r.count,
      percentage: Math.round((r.count / total) * 100),
    }));

    // Calculate average
    const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / total);

    // Calculate median
    const sorted = scores.sort((a, b) => a - b);
    const medianScore = sorted.length % 2 === 0
      ? Math.round((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2)
      : sorted[Math.floor(sorted.length / 2)];

    return {
      scoreRanges,
      averageScore,
      medianScore,
    };
  } catch (error) {
    logger.error('Risk distribution failed', { userId, error });
    return {
      scoreRanges: [],
      averageScore: 0,
      medianScore: 0,
    };
  }
}
