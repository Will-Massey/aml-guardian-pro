import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatResponse {
  message: string;
  data?: any;
  suggestions?: string[];
}

interface ParsedQuery {
  intent: 'search_clients' | 'get_compliance_status' | 'get_risk_info' | 'get_document_status' | 'general';
  entities: {
    companyName?: string;
    companyNumber?: string;
    riskLevel?: string;
    dateRange?: { start?: Date; end?: Date };
  };
  filters: Record<string, any>;
}

/**
 * Parse natural language query
 */
function parseQuery(query: string): ParsedQuery {
  const lowerQuery = query.toLowerCase();
  const parsed: ParsedQuery = {
    intent: 'general',
    entities: {},
    filters: {},
  };

  // Intent detection
  if (lowerQuery.includes('find') || lowerQuery.includes('search') || lowerQuery.includes('show me') || lowerQuery.includes('list')) {
    parsed.intent = 'search_clients';
  } else if (lowerQuery.includes('compliant') || lowerQuery.includes('compliance')) {
    parsed.intent = 'get_compliance_status';
  } else if (lowerQuery.includes('risk') || lowerQuery.includes('high risk')) {
    parsed.intent = 'get_risk_info';
  } else if (lowerQuery.includes('document') || lowerQuery.includes('verification')) {
    parsed.intent = 'get_document_status';
  }

  // Entity extraction - Company name
  const companyMatch = query.match(/(?:company|client)\s+(?:named?|called)?\s*["']?([A-Z][A-Za-z0-9\s&.,]+)["']?/i);
  if (companyMatch) {
    parsed.entities.companyName = companyMatch[1].trim();
  }

  // Entity extraction - Company number
  const numberMatch = query.match(/(?:number|no\.?)\s*[:\s]+(\d{6,8})/i);
  if (numberMatch) {
    parsed.entities.companyNumber = numberMatch[1];
  }

  // Risk level extraction
  if (lowerQuery.includes('high risk')) {
    parsed.entities.riskLevel = 'HIGH';
    parsed.filters.riskLevel = 'HIGH';
  } else if (lowerQuery.includes('medium risk')) {
    parsed.entities.riskLevel = 'MEDIUM';
    parsed.filters.riskLevel = 'MEDIUM';
  } else if (lowerQuery.includes('low risk')) {
    parsed.entities.riskLevel = 'LOW';
    parsed.filters.riskLevel = 'LOW';
  }

  // Date range extraction
  if (lowerQuery.includes('this month')) {
    const now = new Date();
    parsed.entities.dateRange = {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
    };
  } else if (lowerQuery.includes('last month')) {
    const now = new Date();
    parsed.entities.dateRange = {
      start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      end: new Date(now.getFullYear(), now.getMonth(), 0),
    };
  }

  return parsed;
}

/**
 * Process natural language query
 */
export async function processQuery(
  query: string,
  userId: string
): Promise<ChatResponse> {
  try {
    const parsed = parseQuery(query);

    switch (parsed.intent) {
      case 'search_clients':
        return await handleClientSearch(parsed, userId);
      case 'get_compliance_status':
        return await handleComplianceQuery(parsed, userId);
      case 'get_risk_info':
        return await handleRiskQuery(parsed, userId);
      case 'get_document_status':
        return await handleDocumentQuery(parsed, userId);
      default:
        return handleGeneralQuery(query);
    }
  } catch (error) {
    logger.error('NLP query processing failed', { query, error });
    return {
      message: 'I apologize, but I encountered an error processing your request. Please try again or contact support.',
    };
  }
}

/**
 * Handle client search queries
 */
async function handleClientSearch(
  parsed: ParsedQuery,
  userId: string
): Promise<ChatResponse> {
  const where: any = { userId };

  if (parsed.entities.companyName) {
    where.companyName = {
      contains: parsed.entities.companyName,
      mode: 'insensitive',
    };
  }

  if (parsed.entities.companyNumber) {
    where.companyNumber = parsed.entities.companyNumber;
  }

  if (parsed.filters.riskLevel) {
    where.riskLevel = parsed.filters.riskLevel;
  }

  if (parsed.entities.dateRange) {
    where.createdAt = {
      gte: parsed.entities.dateRange.start,
      lte: parsed.entities.dateRange.end,
    };
  }

  const clients = await prisma.client.findMany({
    where,
    include: {
      riskAssessment: {
        select: {
          overallRiskLevel: true,
          riskScore: true,
        },
      },
    },
    take: 10,
  });

  if (clients.length === 0) {
    return {
      message: `I couldn't find any clients matching your criteria.`,
      suggestions: [
        'Try searching with a different company name',
        'Check if the company number is correct',
        'View all clients',
      ],
    };
  }

  const clientList = clients.map(c => 
    `• ${c.companyName} (${c.riskLevel} Risk)`
  ).join('\n');

  return {
    message: `I found ${clients.length} client(s):\n\n${clientList}`,
    data: clients,
    suggestions: [
      'View details for a specific client',
      'Check compliance status',
      'Generate risk report',
    ],
  };
}

/**
 * Handle compliance queries
 */
async function handleComplianceQuery(
  parsed: ParsedQuery,
  userId: string
): Promise<ChatResponse> {
  const totalClients = await prisma.client.count({ where: { userId } });
  const compliantClients = await prisma.client.count({
    where: {
      userId,
      identityVerified: true,
      addressVerified: true,
      pepScreened: true,
      sanctionsScreened: true,
    },
  });

  const nonCompliantClients = await prisma.client.findMany({
    where: {
      userId,
      OR: [
        { identityVerified: false },
        { addressVerified: false },
        { pepScreened: false },
        { sanctionsScreened: false },
      ],
    },
    select: {
      companyName: true,
      identityVerified: true,
      addressVerified: true,
      pepScreened: true,
      sanctionsScreened: true,
    },
    take: 5,
  });

  const complianceRate = totalClients > 0 
    ? Math.round((compliantClients / totalClients) * 100) 
    : 0;

  let message = `📊 Compliance Summary:\n\n`;
  message += `• Total Clients: ${totalClients}\n`;
  message += `• Fully Compliant: ${compliantClients} (${complianceRate}%)\n`;
  message += `• Needs Attention: ${totalClients - compliantClients}\n\n`;

  if (nonCompliantClients.length > 0) {
    message += `⚠️ Clients requiring attention:\n`;
    nonCompliantClients.forEach(c => {
      const missing = [];
      if (!c.identityVerified) missing.push('ID');
      if (!c.addressVerified) missing.push('Address');
      if (!c.pepScreened) missing.push('PEP');
      if (!c.sanctionsScreened) missing.push('Sanctions');
      message += `• ${c.companyName} - Missing: ${missing.join(', ')}\n`;
    });
  }

  return {
    message,
    data: {
      totalClients,
      compliantClients,
      complianceRate,
      nonCompliantClients,
    },
    suggestions: [
      'View all non-compliant clients',
      'Generate compliance report',
      'Check upcoming reviews',
    ],
  };
}

/**
 * Handle risk-related queries
 */
async function handleRiskQuery(
  parsed: ParsedQuery,
  userId: string
): Promise<ChatResponse> {
  const riskDistribution = await prisma.client.groupBy({
    by: ['riskLevel'],
    where: { userId },
    _count: { riskLevel: true },
  });

  const highRiskClients = await prisma.client.findMany({
    where: { userId, riskLevel: 'HIGH' },
    include: {
      riskAssessment: {
        select: {
          riskScore: true,
          businessSectorRisk: true,
          geographicRisk: true,
        },
      },
    },
    take: 5,
  });

  let message = `🎯 Risk Distribution:\n\n`;
  
  riskDistribution.forEach(r => {
    const emoji = r.riskLevel === 'HIGH' ? '🔴' : r.riskLevel === 'MEDIUM' ? '🟡' : '🟢';
    message += `${emoji} ${r.riskLevel}: ${r._count.riskLevel} clients\n`;
  });

  if (highRiskClients.length > 0) {
    message += `\n⚠️ High-risk clients requiring attention:\n`;
    highRiskClients.forEach(c => {
      message += `• ${c.companyName} (Score: ${c.riskAssessment?.riskScore || 'N/A'})\n`;
    });
  }

  return {
    message,
    data: {
      riskDistribution,
      highRiskClients,
    },
    suggestions: [
      'Review high-risk clients',
      'Generate risk report',
      'Check risk trends',
    ],
  };
}

/**
 * Handle document-related queries
 */
async function handleDocumentQuery(
  parsed: ParsedQuery,
  userId: string
): Promise<ChatResponse> {
  const pendingDocs = await prisma.document.count({
    where: { userId, status: 'PENDING_VERIFICATION' },
  });

  const recentDocuments = await prisma.document.findMany({
    where: { userId },
    include: {
      client: {
        select: { companyName: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  let message = `📄 Document Status:\n\n`;
  message += `• Pending Verification: ${pendingDocs} documents\n\n`;

  if (recentDocuments.length > 0) {
    message += `📎 Recent documents:\n`;
    recentDocuments.forEach(d => {
      const status = d.status.replace(/_/g, ' ');
      message += `• ${d.name} - ${d.client.companyName} (${status})\n`;
    });
  }

  return {
    message,
    data: {
      pendingDocs,
      recentDocuments,
    },
    suggestions: pendingDocs > 0 
      ? ['Verify pending documents', 'View all documents', 'Check document expiry dates']
      : ['View all documents', 'Upload new document'],
  };
}

/**
 * Handle general AML questions
 */
function handleGeneralQuery(query: string): ChatResponse {
  const lowerQuery = query.toLowerCase();

  // AML Knowledge Base responses
  if (lowerQuery.includes('what is cdd') || lowerQuery.includes('customer due diligence')) {
    return {
      message: `Customer Due Diligence (CDD) is the process of verifying the identity of your clients and assessing their risk profile. Under UK AML regulations, you must:

1. Identify the customer and verify their identity
2. Identify the beneficial owner (for corporate clients)
3. Understand the purpose and nature of the business relationship
4. Conduct ongoing monitoring

There are three levels of CDD:
• Simplified - for low-risk clients
• Standard - for most clients
• Enhanced - for high-risk clients (PEPs, complex structures, high-risk jurisdictions)`,
      suggestions: ['How do I conduct enhanced due diligence?', 'What are high-risk indicators?'],
    };
  }

  if (lowerQuery.includes('pep') || lowerQuery.includes('politically exposed person')) {
    return {
      message: `A Politically Exposed Person (PEP) is an individual who holds or has held prominent public office. This includes:

• Heads of state, government ministers
• Senior politicians and political party officials
• Senior judicial or military officials
• Senior executives of state-owned corporations
• Close family members and associates of PEPs

PEPs require Enhanced Due Diligence (EDD) including:
• Senior management approval
• Enhanced ongoing monitoring
• Source of funds/wealth verification`,
      suggestions: ['How do I screen for PEPs?', 'What is enhanced due diligence?'],
    };
  }

  if (lowerQuery.includes('sanctions')) {
    return {
      message: `Sanctions screening is mandatory under UK AML regulations. You must check clients against:

• UK Sanctions List (OFSI)
• UN Consolidated List
• EU Consolidated List
• US OFAC lists (if dealing with USD)

Screening should be conducted:
• At onboarding
• Periodically (at least annually)
• When circumstances change
• On trigger events

AML Guardian Pro automates this screening and alerts you to any matches.`,
      suggestions: ['How do I screen a client?', 'What happens if there is a match?'],
    };
  }

  if (lowerQuery.includes('hello') || lowerQuery.includes('hi')) {
    return {
      message: `Hello! I'm your AML Guardian AI assistant. I can help you with:

🔍 Finding and searching clients
📊 Checking compliance status
🎯 Reviewing risk assessments
📄 Managing documents
❓ Answering AML regulation questions

What would you like to know?`,
      suggestions: ['Show me high-risk clients', 'Check compliance status', 'What is CDD?'],
    };
  }

  // Default response
  return {
    message: `I'm not sure I understood your question. I can help you with:

• Searching for clients by name or company number
• Checking compliance status across your firm
• Reviewing risk assessments and risk levels
• Managing document verification
• Answering questions about AML regulations

Could you try rephrasing your question, or select one of the suggestions below?`,
    suggestions: [
      'Show all clients',
      'Check compliance status',
      'Find high-risk clients',
      'What is CDD?',
    ],
  };
}

/**
 * Generate risk assessment narrative
 */
export async function generateRiskNarrative(
  clientId: string
): Promise<string> {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { riskAssessment: true },
    });

    if (!client || !client.riskAssessment) {
      return 'Risk assessment not available for this client.';
    }

    const ra = client.riskAssessment;

    let narrative = `Risk Assessment for ${client.companyName}\n\n`;
    narrative += `Overall Risk Level: ${ra.overallRiskLevel} (Score: ${ra.riskScore}/100)\n\n`;
    
    narrative += `Risk Factors:\n`;
    narrative += `• Business Sector: ${ra.businessSectorRisk}\n`;
    narrative += `• Geographic: ${ra.geographicRisk}\n`;
    narrative += `• Structure: ${ra.structureRisk}\n`;
    narrative += `• Transparency: ${ra.transparencyRisk}\n`;
    narrative += `• PEP Risk: ${ra.pepRisk}\n`;
    narrative += `• Sanctions Risk: ${ra.sanctionsRisk}\n\n`;

    if (ra.riskJustification) {
      narrative += `Justification:\n${ra.riskJustification}\n\n`;
    }

    narrative += `Required Documents:\n`;
    (ra.requiredDocuments as string[] || []).forEach(doc => {
      narrative += `• ${doc}\n`;
    });

    return narrative;
  } catch (error) {
    logger.error('Failed to generate risk narrative', { clientId, error });
    return 'Unable to generate risk narrative.';
  }
}
