// AI service - uses Kimi/Claurst MCP when available, falls back to rule-based
declare const claurst_query: any;
import { Client, RiskAssessment, RiskLevel, RiskFactor, Address } from '../../types';
import { logger } from '../../utils/logger';

// Risk factors database for UK AML compliance
const HIGH_RISK_SIC_CODES = [
  // Money Service Businesses
  '64191', '64192', '64921', '64922',  // Banking, finance
  '66190', '64190',  // Financial intermediation
  // Gambling
  '92000',
  // Crypto/Virtual Currencies
  '62012', '62020', '63120', // Software, IT consultancy, web portals
  // Precious metals/stones
  '32120', '32130', // Jewellery
  // Real estate high value
  '68100', '68201', '68209',
];

const HIGH_RISK_COUNTRIES = [
  'AF', // Afghanistan
  'BA', // Bosnia and Herzegovina
  'BY', // Belarus
  'CF', // Central African Republic
  'CU', // Cuba
  'IR', // Iran
  'IQ', // Iraq
  'KP', // North Korea
  'LB', // Lebanon
  'LY', // Libya
  'ML', // Mali
  'MM', // Myanmar
  'NI', // Nicaragua
  'RU', // Russia
  'SO', // Somalia
  'SS', // South Sudan
  'SD', // Sudan
  'SY', // Syria
  'VE', // Venezuela
  'YE', // Yemen
  'ZW', // Zimbabwe
];

const COMPLEX_STRUCTURE_KEYWORDS = [
  'trust', 'trustee', 'foundation', 'offshore', 'tax haven',
  'nominee', 'bearer', 'shell', 'special purpose', 'spv',
  'limited partnership', 'lp', 'llp',
];

interface RiskAnalysisInput {
  companyName: string;
  companyNumber?: string;
  companyType?: string;
  sicCodes: string[];
  businessDescription?: string;
  registeredAddress?: Address;
  officers?: any[];
  pscs?: any[];
  incorporationDate?: Date;
}

class AIRiskAssessmentService {
  /**
   * Perform comprehensive AI-powered risk assessment
   */
  async assessRisk(input: RiskAnalysisInput): Promise<Partial<RiskAssessment>> {
    try {
      // Get structured analysis from AI
      const aiAnalysis = await this.getAIAnalysis(input);
      
      // Calculate individual risk factors
      const businessSectorRisk = this.assessBusinessSectorRisk(input);
      const geographicRisk = this.assessGeographicRisk(input);
      const structureRisk = this.assessStructureRisk(input);
      const transparencyRisk = this.assessTransparencyRisk(input);
      const pepRisk = this.assessPEPRisk(input);
      const sanctionsRisk = this.assessSanctionsRisk(input);

      // Calculate overall risk
      const overallRisk = this.calculateOverallRisk(
        businessSectorRisk,
        geographicRisk,
        structureRisk,
        transparencyRisk,
        pepRisk,
        sanctionsRisk
      );

      // Generate required documents checklist
      const requiredDocuments = this.generateDocumentChecklist(overallRisk, input);

      // Generate ongoing monitoring requirements
      const ongoingMonitoring = this.generateOngoingMonitoring(overallRisk, input);

      // Generate risk mitigation recommendations
      const riskMitigation = this.generateRiskMitigation(overallRisk, input);

      // Generate risk justification
      const riskJustification = this.generateRiskJustification(
        overallRisk,
        businessSectorRisk,
        geographicRisk,
        structureRisk,
        transparencyRisk,
        input
      );

      logger.info('AI Risk Assessment completed', {
        companyName: input.companyName,
        overallRisk,
        riskScore: this.riskLevelToScore(overallRisk),
      });

      return {
        overallRiskLevel: overallRisk,
        riskScore: this.riskLevelToScore(overallRisk),
        businessSectorRisk,
        geographicRisk,
        structureRisk,
        transparencyRisk,
        pepRisk,
        sanctionsRisk,
        riskFactors: aiAnalysis.riskFactors,
        riskMitigation,
        requiredDocuments,
        ongoingMonitoring,
        aiAnalysis: aiAnalysis.fullAnalysis,
        aiGeneratedAt: new Date(),
        aiModel: 'claude-opus-4',
        riskJustification,
      };
    } catch (error) {
      logger.error('AI Risk Assessment failed', error);
      // Return default medium risk assessment on failure
      return this.getDefaultRiskAssessment();
    }
  }

  /**
   * Get detailed AI analysis
   */
  private async getAIAnalysis(input: RiskAnalysisInput): Promise<{
    riskFactors: any[];
    fullAnalysis: string;
  }> {
    const prompt = this.buildAnalysisPrompt(input);

    try {
      const response = await claurst_query({
        prompt,
        provider: 'anthropic',
        model: 'claude-opus-4',
      });

      // Parse the AI response
      return this.parseAIResponse(response);
    } catch (error) {
      logger.error('AI query failed', error);
      return {
        riskFactors: [],
        fullAnalysis: 'AI analysis unavailable - manual review required',
      };
    }
  }

  /**
   * Build the analysis prompt for AI
   */
  private buildAnalysisPrompt(input: RiskAnalysisInput): string {
    const sicDescriptions = input.sicCodes.map(code => {
      // Simplified - in real implementation would fetch full descriptions
      return code;
    }).join(', ');

    return `You are an expert UK AML (Anti-Money Laundering) compliance analyst. Analyze the following client for risk assessment purposes.

COMPANY INFORMATION:
- Name: ${input.companyName}
- Company Number: ${input.companyNumber || 'N/A'}
- Company Type: ${input.companyType || 'N/A'}
- SIC Codes: ${sicDescriptions}
- Business Description: ${input.businessDescription || 'N/A'}
- Incorporation Date: ${input.incorporationDate?.toISOString() || 'N/A'}
- Registered Address: ${input.registeredAddress ? `${input.registeredAddress.addressLine1}, ${input.registeredAddress.city}, ${input.registeredAddress.postcode}, ${input.registeredAddress.country}` : 'N/A'}

OFFICERS (${input.officers?.length || 0}):
${JSON.stringify(input.officers?.map(o => ({ name: o.name, role: o.role })) || [], null, 2)}

PSCs (${input.pscs?.length || 0}):
${JSON.stringify(input.pscs?.map(p => ({ name: p.name, control: p.natureOfControl })) || [], null, 2)}

UK AML REGULATIONS FRAMEWORK:
Under UK AML regulations, accountants must assess:
1. Business sector risk (cash-intensive, MSB, gambling, crypto, etc.)
2. Geographic risk (sanctioned countries, high-risk jurisdictions)
3. Ownership structure complexity
4. Transparency of beneficial ownership
5. PEP (Politically Exposed Persons) exposure
6. Sanctions screening matches

Provide your analysis in this exact format:

RISK_FACTORS:
1. [Category]: [Risk Level - LOW/MEDIUM/HIGH/CRITICAL] - [Detailed explanation]
2. [Category]: [Risk Level] - [Detailed explanation]
(continue as needed)

FULL_ANALYSIS:
[Comprehensive 2-3 paragraph analysis of the risk profile, specific red flags identified, and recommended CDD measures]

Be thorough and specific. Consider the company's business activities, structure, and any potential AML risks.`;
  }

  /**
   * Parse AI response into structured format
   */
  private parseAIResponse(response: string): {
    riskFactors: any[];
    fullAnalysis: string;
  } {
    try {
      const riskFactors: any[] = [];
      let fullAnalysis = response;

      // Extract risk factors section
      const riskFactorsMatch = response.match(/RISK_FACTORS:([\s\S]*?)(?=FULL_ANALYSIS:|$)/i);
      if (riskFactorsMatch) {
        const lines = riskFactorsMatch[1].trim().split('\n');
        lines.forEach(line => {
          const match = line.match(/^\d+\.\s*(.+?):\s*(LOW|MEDIUM|HIGH|CRITICAL)\s*-\s*(.+)$/i);
          if (match) {
            riskFactors.push({
              category: match[1].trim(),
              risk: match[2].toUpperCase() as RiskFactor,
              description: match[3].trim(),
            });
          }
        });
      }

      // Extract full analysis
      const analysisMatch = response.match(/FULL_ANALYSIS:([\s\S]*?)$/i);
      if (analysisMatch) {
        fullAnalysis = analysisMatch[1].trim();
      }

      return { riskFactors, fullAnalysis };
    } catch (error) {
      logger.error('Failed to parse AI response', error);
      return {
        riskFactors: [],
        fullAnalysis: response,
      };
    }
  }

  /**
   * Assess business sector risk
   */
  private assessBusinessSectorRisk(input: RiskAnalysisInput): RiskFactor {
    let riskScore = 0;

    // Check SIC codes
    for (const sic of input.sicCodes) {
      if (HIGH_RISK_SIC_CODES.includes(sic)) {
        riskScore += 3;
      }
    }

    // Check business description for high-risk keywords
    const description = (input.businessDescription || '').toLowerCase();
    const highRiskKeywords = [
      'cryptocurrency', 'crypto', 'bitcoin', 'virtual currency', 'digital currency',
      'gambling', 'betting', 'casino', 'gaming',
      'money transfer', 'remittance', 'currency exchange', 'forex',
      'precious metal', 'gold', 'silver', 'jewellery', 'diamond',
      'real estate', 'property development', 'property investment',
      'shell', 'offshore', 'tax planning', 'tax avoidance',
    ];

    for (const keyword of highRiskKeywords) {
      if (description.includes(keyword)) {
        riskScore += 2;
      }
    }

    // Cash-intensive businesses
    const cashIntensive = [
      'retail', 'restaurant', 'cafe', 'bar', 'pub', 'nightclub',
      ' taxi', 'car wash', 'pawn', 'second hand',
    ];

    for (const keyword of cashIntensive) {
      if (description.includes(keyword)) {
        riskScore += 1;
      }
    }

    return this.scoreToRiskFactor(riskScore, 5);
  }

  /**
   * Assess geographic risk
   */
  private assessGeographicRisk(input: RiskAnalysisInput): RiskFactor {
    let riskScore = 0;

    // Check registered address country
    const country = input.registeredAddress?.country || '';
    if (country && country.toLowerCase() !== 'united kingdom' && country.toLowerCase() !== 'england') {
      riskScore += 1;
    }

    // Check for high-risk countries in address
    for (const highRiskCountry of HIGH_RISK_COUNTRIES) {
      if (country.includes(highRiskCountry)) {
        riskScore += 3;
      }
    }

    // Check officer nationalities and addresses
    for (const officer of input.officers || []) {
      if (officer.nationality) {
        const nat = officer.nationality.toLowerCase();
        if (!['british', 'english', 'scottish', 'welsh', 'northern irish'].includes(nat)) {
          riskScore += 0.5;
        }
      }
    }

    return this.scoreToRiskFactor(riskScore, 5);
  }

  /**
   * Assess structure risk
   */
  private assessStructureRisk(input: RiskAnalysisInput): RiskFactor {
    let riskScore = 0;

    // Check company type
    const companyType = (input.companyType || '').toLowerCase();
    if (companyType.includes('limited partnership') || companyType.includes('lp')) {
      riskScore += 2;
    }

    // Check business description for complex structure keywords
    const description = (input.businessDescription || '').toLowerCase();
    for (const keyword of COMPLEX_STRUCTURE_KEYWORDS) {
      if (description.includes(keyword)) {
        riskScore += 2;
      }
    }

    // Multiple PSCs with complex control structures
    if (input.pscs && input.pscs.length > 2) {
      riskScore += 1;
    }

    return this.scoreToRiskFactor(riskScore, 5);
  }

  /**
   * Assess transparency risk
   */
  private assessTransparencyRisk(input: RiskAnalysisInput): RiskFactor {
    let riskScore = 0;

    // Check for PSCs
    if (!input.pscs || input.pscs.length === 0) {
      riskScore += 2;
    }

    // Check for officers
    if (!input.officers || input.officers.length === 0) {
      riskScore += 2;
    }

    // Recent incorporation (less than 1 year)
    if (input.incorporationDate) {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      if (input.incorporationDate > oneYearAgo) {
        riskScore += 1;
      }
    }

    // Multiple changes in officers (would need filing history)

    return this.scoreToRiskFactor(riskScore, 4);
  }

  /**
   * Assess PEP risk
   */
  private assessPEPRisk(input: RiskAnalysisInput): RiskFactor {
    // This would typically integrate with a PEP screening API
    // For now, return LOW as a placeholder - real implementation would:
    // 1. Check officer and PSC names against PEP databases
    // 2. Screen for family members and close associates
    // 3. Flag any matches for enhanced due diligence
    
    // Check for potentially PEP-related keywords in names
    const names = [
      ...(input.officers || []).map(o => o.name),
      ...(input.pscs || []).map(p => p.name),
    ];

    const pepKeywords = ['lord', 'sir', 'dame', 'honourable', 'mp', 'minister'];
    
    for (const name of names) {
      const lowerName = name.toLowerCase();
      for (const keyword of pepKeywords) {
        if (lowerName.includes(keyword)) {
          return RiskFactor.MEDIUM; // Flag for manual review
        }
      }
    }

    return RiskFactor.LOW;
  }

  /**
   * Assess sanctions risk
   */
  private assessSanctionsRisk(input: RiskAnalysisInput): RiskFactor {
    // This would typically integrate with a sanctions screening API
    // For now, return LOW as a placeholder - real implementation would:
    // 1. Check company name, officer names, PSC names against sanctions lists
    // 2. Check addresses against sanctioned locations
    // 3. Flag any matches
    
    // Basic check for high-risk country in address
    const country = input.registeredAddress?.country || '';
    for (const highRiskCountry of HIGH_RISK_COUNTRIES.slice(0, 10)) {
      if (country.toLowerCase().includes(highRiskCountry.toLowerCase())) {
        return RiskFactor.HIGH;
      }
    }

    return RiskFactor.LOW;
  }

  /**
   * Calculate overall risk level
   */
  private calculateOverallRisk(
    businessSectorRisk: RiskFactor,
    geographicRisk: RiskFactor,
    structureRisk: RiskFactor,
    transparencyRisk: RiskFactor,
    pepRisk: RiskFactor,
    sanctionsRisk: RiskFactor
  ): RiskLevel {
    const risks = [businessSectorRisk, geographicRisk, structureRisk, transparencyRisk, pepRisk, sanctionsRisk];
    
    // Count risk levels
    const criticalCount = risks.filter(r => r === RiskFactor.CRITICAL).length;
    const highCount = risks.filter(r => r === RiskFactor.HIGH).length;
    const mediumCount = risks.filter(r => r === RiskFactor.MEDIUM).length;

    // If any critical risk, overall is HIGH
    if (criticalCount > 0) {
      return RiskLevel.HIGH;
    }

    // If 2+ high risks, overall is HIGH
    if (highCount >= 2) {
      return RiskLevel.HIGH;
    }

    // If 1 high risk or 2+ medium risks, overall is MEDIUM
    if (highCount === 1 || mediumCount >= 2) {
      return RiskLevel.MEDIUM;
    }

    // Otherwise LOW
    return RiskLevel.LOW;
  }

  /**
   * Generate document checklist based on risk level
   * Minimum legal requirements + enhanced for higher risk
   */
  private generateDocumentChecklist(riskLevel: RiskLevel, input: RiskAnalysisInput): string[] {
    // Minimum legal requirement (CDD) - always required
    const requiredDocuments = [
      'Certificate of Incorporation',
      'ID Verification for at least one Director',
      'Proof of Registered Address',
    ];

    // Optional additional documents based on risk
    const optionalDocuments: string[] = [];

    if (riskLevel === RiskLevel.MEDIUM || riskLevel === RiskLevel.HIGH) {
      optionalDocuments.push(
        'Source of Funds Declaration (recommended)',
        'Expected Activity Profile (recommended)'
      );
    }

    if (riskLevel === RiskLevel.HIGH) {
      optionalDocuments.push(
        'Source of Wealth Declaration (enhanced due diligence)',
        'Enhanced Due Diligence Questionnaire',
        'PEP Screening Results',
        'Sanctions Screening Results'
      );
    }

    return [...requiredDocuments, ...optionalDocuments];
  }

  /**
   * Generate ongoing monitoring requirements
   */
  private generateOngoingMonitoring(riskLevel: RiskLevel, input: RiskAnalysisInput): string {
    if (riskLevel === RiskLevel.HIGH) {
      return `Enhanced ongoing monitoring required:
- Quarterly transaction reviews
- Annual face-to-face meetings
- Ad-hoc reviews triggered by significant transactions
- Annual PEP and sanctions re-screening
- Review of source of funds annually`;
    }

    if (riskLevel === RiskLevel.MEDIUM) {
      return `Standard ongoing monitoring:
- Annual transaction reviews
- Bi-annual client contact
- Trigger-based reviews for unusual activity
- Annual sanctions screening`;
    }

    return `Simplified monitoring:
- Bi-annual transaction reviews
- Annual client contact
- Sanctions screening on renewal only`;
  }

  /**
   * Generate risk mitigation recommendations
   */
  private generateRiskMitigation(riskLevel: RiskLevel, input: RiskAnalysisInput): string[] {
    const mitigations: string[] = [];

    if (riskLevel === RiskLevel.HIGH) {
      mitigations.push(
        'Obtain senior partner approval before engagement',
        'Conduct Enhanced Due Diligence (EDD)',
        'Verify source of funds and wealth',
        'Obtain independent verification of beneficial ownership',
        'Establish transaction monitoring thresholds',
        'Schedule more frequent client reviews'
      );
    } else if (riskLevel === RiskLevel.MEDIUM) {
      mitigations.push(
        'Conduct Standard Due Diligence',
        'Verify identity of all beneficial owners',
        'Document business rationale',
        'Establish expected transaction patterns'
      );
    } else {
      mitigations.push(
        'Conduct Simplified Due Diligence',
        'Verify company existence',
        'Document business relationship purpose'
      );
    }

    return mitigations;
  }

  /**
   * Generate risk justification narrative
   */
  private generateRiskJustification(
    overallRisk: RiskLevel,
    businessSectorRisk: RiskFactor,
    geographicRisk: RiskFactor,
    structureRisk: RiskFactor,
    transparencyRisk: RiskFactor,
    input: RiskAnalysisInput
  ): string {
    const parts: string[] = [];

    parts.push(`The client ${input.companyName} has been assessed as ${overallRisk} RISK.`);
    parts.push('');
    parts.push('Key Risk Factors:');
    parts.push(`- Business Sector Risk: ${businessSectorRisk}`);
    parts.push(`- Geographic Risk: ${geographicRisk}`);
    parts.push(`- Structure Risk: ${structureRisk}`);
    parts.push(`- Transparency Risk: ${transparencyRisk}`);
    parts.push('');
    parts.push('Justification:');
    
    if (overallRisk === RiskLevel.LOW) {
      parts.push('The client presents standard risk profile with transparent UK-based ownership,');
      parts.push('established business activities, and no apparent high-risk indicators.');
    } else if (overallRisk === RiskLevel.MEDIUM) {
      parts.push('The client presents some risk factors that warrant additional scrutiny,');
      parts.push('including business sector considerations or structural complexity.');
    } else {
      parts.push('The client presents significant risk factors requiring Enhanced Due Diligence,');
      parts.push('senior approval, and ongoing monitoring.');
    }

    return parts.join('\n');
  }

  /**
   * Convert risk level to numeric score
   */
  private riskLevelToScore(riskLevel: RiskLevel): number {
    switch (riskLevel) {
      case RiskLevel.LOW:
        return 25;
      case RiskLevel.MEDIUM:
        return 50;
      case RiskLevel.HIGH:
        return 75;
      default:
        return 50;
    }
  }

  /**
   * Convert score to risk factor
   */
  private scoreToRiskFactor(score: number, threshold: number): RiskFactor {
    if (score >= threshold * 0.8) {
      return RiskFactor.CRITICAL;
    }
    if (score >= threshold * 0.6) {
      return RiskFactor.HIGH;
    }
    if (score >= threshold * 0.3) {
      return RiskFactor.MEDIUM;
    }
    return RiskFactor.LOW;
  }

  /**
   * Get default risk assessment when AI fails
   */
  private getDefaultRiskAssessment(): Partial<RiskAssessment> {
    return {
      overallRiskLevel: RiskLevel.MEDIUM,
      riskScore: 50,
      businessSectorRisk: RiskFactor.MEDIUM,
      geographicRisk: RiskFactor.MEDIUM,
      structureRisk: RiskFactor.MEDIUM,
      transparencyRisk: RiskFactor.MEDIUM,
      pepRisk: RiskFactor.LOW,
      sanctionsRisk: RiskFactor.LOW,
      riskFactors: [],
      riskMitigation: ['Manual review required due to AI analysis failure'],
      requiredDocuments: ['Certificate of Incorporation', 'ID Verification for Directors'],
      ongoingMonitoring: 'Standard ongoing monitoring to be determined after manual review',
      aiAnalysis: 'AI analysis failed - manual review required',
      aiGeneratedAt: new Date(),
      aiModel: 'claude-opus-4',
      riskJustification: 'Risk assessment could not be completed automatically. Manual review required.',
    };
  }
}

export const aiRiskAssessmentService = new AIRiskAssessmentService();
