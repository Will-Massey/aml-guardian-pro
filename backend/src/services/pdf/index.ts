import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import fs from 'fs/promises';
import path from 'path';
import { Client, RiskAssessment, User, DocumentType } from '../../types';
import { logger } from '../../utils/logger';
import { config } from '../../config';

class PDFGenerationService {
  private templatesDir: string;

  constructor() {
    this.templatesDir = path.join(__dirname, '../../../templates');
  }

  /**
   * Generate a complete AML compliance document package
   */
  async generateAMLDocumentPackage(
    client: Client,
    riskAssessment: RiskAssessment,
    user: User,
    outputPath: string
  ): Promise<string> {
    try {
      const html = await this.buildCompleteAMLPDF(client, riskAssessment, user);
      const pdfPath = await this.generatePDF(html, outputPath);
      
      logger.info('Generated AML document package', {
        clientId: client.id,
        clientName: client.companyName,
        outputPath: pdfPath,
      });

      return pdfPath;
    } catch (error) {
      logger.error('Failed to generate AML document package', error);
      throw new Error('PDF generation failed');
    }
  }

  /**
   * Generate individual document by type
   */
  async generateDocument(
    type: DocumentType,
    client: Client,
    riskAssessment: RiskAssessment,
    user: User,
    outputPath: string
  ): Promise<string> {
    try {
      let html: string;

      switch (type) {
        case 'RISK_ASSESSMENT':
          html = await this.buildRiskAssessmentPDF(client, riskAssessment, user);
          break;
        case 'AML_POLICY_ACKNOWLEDGEMENT':
          html = await this.buildAMLPolicyAcknowledgementPDF(client, user);
          break;
        case 'CUSTOMER_DUE_DILIGENCE':
          html = await this.buildCDDPDF(client, riskAssessment, user);
          break;
        case 'ONGOING_MONITORING_PLAN':
          html = await this.buildOngoingMonitoringPDF(client, riskAssessment, user);
          break;
        default:
          html = await this.buildCompleteAMLPDF(client, riskAssessment, user);
      }

      const pdfPath = await this.generatePDF(html, outputPath);
      
      logger.info('Generated document', {
        type,
        clientId: client.id,
        outputPath: pdfPath,
      });

      return pdfPath;
    } catch (error) {
      logger.error('Failed to generate document', error);
      throw new Error('PDF generation failed');
    }
  }

  /**
   * Generate PDF from HTML using Puppeteer
   */
  private async generatePDF(html: string, outputPath: string): Promise<string> {
    const browser = await puppeteer.launch({
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: await chromium.executablePath(),
      headless: chromium.headless as boolean | 'new',
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Ensure directory exists
      await fs.mkdir(path.dirname(outputPath), { recursive: true });

      await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm',
        },
      });

      return outputPath;
    } finally {
      await browser.close();
    }
  }

  /**
   * Build complete AML compliance document
   */
  private async buildCompleteAMLPDF(
    client: Client,
    riskAssessment: RiskAssessment,
    user: User
  ): Promise<string> {
    const styles = this.getStyles();
    const header = this.getHeader(user);
    const footer = this.getFooter();

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>AML Compliance Package - ${client.companyName}</title>
  <style>${styles}</style>
</head>
<body>
  ${header}
  
  <div class="cover-page">
    <h1>Anti-Money Laundering</h1>
    <h2>Compliance Documentation</h2>
    <div class="cover-company">
      <h3>${client.companyName}</h3>
      <p>Company Number: ${client.companyNumber || 'N/A'}</p>
      <p>Prepared by: ${user.firmName}</p>
      <p>Date: ${new Date().toLocaleDateString('en-GB')}</p>
    </div>
    <div class="confidential">
      <p>CONFIDENTIAL - FOR COMPLIANCE PURPOSES ONLY</p>
    </div>
  </div>

  <div class="page-break"></div>

  ${this.getTableOfContents()}

  <div class="page-break"></div>

  ${this.getClientInformationSection(client)}
  
  <div class="page-break"></div>
  
  ${this.getRiskAssessmentSection(riskAssessment)}
  
  <div class="page-break"></div>
  
  ${this.getCDDSection(client, riskAssessment)}
  
  <div class="page-break"></div>
  
  ${this.getOngoingMonitoringSection(riskAssessment)}
  
  <div class="page-break"></div>
  
  ${this.getDeclarationSection(client, user)}

  ${footer}
</body>
</html>`;
  }

  /**
   * Build risk assessment specific document
   */
  private async buildRiskAssessmentPDF(
    client: Client,
    riskAssessment: RiskAssessment,
    user: User
  ): Promise<string> {
    const styles = this.getStyles();
    const header = this.getHeader(user);
    const footer = this.getFooter();

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Risk Assessment - ${client.companyName}</title>
  <style>${styles}</style>
</head>
<body>
  ${header}
  
  <h1>Client Risk Assessment</h1>
  
  <div class="client-summary">
    <h3>Client Details</h3>
    <table>
      <tr><td><strong>Company Name:</strong></td><td>${client.companyName}</td></tr>
      <tr><td><strong>Company Number:</strong></td><td>${client.companyNumber || 'N/A'}</td></tr>
      <tr><td><strong>Assessment Date:</strong></td><td>${riskAssessment.aiGeneratedAt.toLocaleDateString('en-GB')}</td></tr>
      <tr><td><strong>Assessed By:</strong></td><td>${user.firmName}</td></tr>
    </table>
  </div>

  ${this.getRiskAssessmentSection(riskAssessment)}

  ${footer}
</body>
</html>`;
  }

  /**
   * Build AML Policy Acknowledgement document
   */
  private async buildAMLPolicyAcknowledgementPDF(
    client: Client,
    user: User
  ): Promise<string> {
    const styles = this.getStyles();
    const header = this.getHeader(user);
    const footer = this.getFooter();

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>AML Policy Acknowledgement - ${client.companyName}</title>
  <style>${styles}</style>
</head>
<body>
  ${header}
  
  <h1>Anti-Money Laundering Policy Acknowledgement</h1>
  
  <div class="client-info">
    <p><strong>Client:</strong> ${client.companyName}</p>
    <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-GB')}</p>
  </div>

  <div class="policy-content">
    <h2>1. Purpose</h2>
    <p>${user.firmName} is committed to preventing money laundering and terrorist financing. 
    We are required by law to verify the identity of our clients and monitor transactions 
    for suspicious activity.</p>

    <h2>2. Client Obligations</h2>
    <p>By signing this document, you acknowledge that:</p>
    <ul>
      <li>You have provided accurate and complete information about your business</li>
      <li>You understand we may need to verify your identity and that of beneficial owners</li>
      <li>You will inform us of any significant changes to your business</li>
      <li>You understand we are required to report suspicious activities to authorities</li>
      <li>All funds provided are from legitimate sources</li>
    </ul>

    <h2>3. Data Protection</h2>
    <p>Your information will be processed in accordance with GDPR and UK data protection laws. 
    Information may be shared with regulatory authorities as required by law.</p>

    <h2>4. Record Keeping</h2>
    <p>We are required to maintain records for a minimum of 5 years after the end of our 
    business relationship, in accordance with UK AML regulations.</p>
  </div>

  <div class="signature-section">
    <h3>Client Declaration</h3>
    <p>I confirm that I have read and understood the above AML policy and agree to comply 
    with its requirements.</p>
    
    <div class="signature-box">
      <p><strong>Signed:</strong> _________________________________</p>
      <p><strong>Name:</strong> _________________________________</p>
      <p><strong>Position:</strong> _________________________________</p>
      <p><strong>Date:</strong> _________________________________</p>
    </div>
  </div>

  <div class="signature-section">
    <h3>Accountant Declaration</h3>
    <p>I confirm that I have explained our AML policy to the client.</p>
    
    <div class="signature-box">
      <p><strong>Signed:</strong> _________________________________</p>
      <p><strong>Name:</strong> ${user.firstName} ${user.lastName}</p>
      <p><strong>Firm:</strong> ${user.firmName}</p>
      <p><strong>Date:</strong> _________________________________</p>
    </div>
  </div>

  ${footer}
</body>
</html>`;
  }

  /**
   * Build CDD document
   */
  private async buildCDDPDF(
    client: Client,
    riskAssessment: RiskAssessment,
    user: User
  ): Promise<string> {
    const styles = this.getStyles();
    const header = this.getHeader(user);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Customer Due Diligence - ${client.companyName}</title>
  <style>${styles}</style>
</head>
<body>
  ${header}
  
  <h1>Customer Due Diligence Record</h1>
  
  ${this.getClientInformationSection(client)}
  
  <div class="cdd-type">
    <h2>Due Diligence Level</h2>
    <div class="risk-badge ${riskAssessment.overallRiskLevel.toLowerCase()}">
      ${riskAssessment.overallRiskLevel} RISK - ${client.cddType || 'STANDARD'} CDD
    </div>
  </div>

  <div class="verification-checklist">
    <h2>Identity Verification</h2>
    <table class="checklist-table">
      <tr>
        <th>Requirement</th>
        <th>Status</th>
        <th>Verified By</th>
        <th>Date</th>
      </tr>
      <tr>
        <td>Company Incorporation Verified</td>
        <td>${client.companyNumber ? '✓ Complete' : '✗ Pending'}</td>
        <td>${user.firmName}</td>
        <td>${new Date().toLocaleDateString('en-GB')}</td>
      </tr>
      <tr>
        <td>Registered Address Verified</td>
        <td>${client.addressVerified ? '✓ Complete' : '✗ Pending'}</td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td>Director Identity Verified</td>
        <td>${client.identityVerified ? '✓ Complete' : '✗ Pending'}</td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td>Beneficial Ownership Identified</td>
        <td>${client.pscs ? '✓ Complete' : '✗ Pending'}</td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td>PEP Screening</td>
        <td>${client.pepScreened ? '✓ Complete' : '✗ Pending'}</td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td>Sanctions Screening</td>
        <td>${client.sanctionsScreened ? '✓ Complete' : '✗ Pending'}</td>
        <td></td>
        <td></td>
      </tr>
    </table>
  </div>

  <div class="source-of-funds">
    <h2>Source of Funds / Wealth</h2>
    <p><strong>Source of Funds:</strong> ${client.sourceOfFunds || 'To be documented'}</p>
    <p><strong>Source of Wealth:</strong> ${client.sourceOfWealth || 'To be documented'}</p>
    <p><strong>Expected Transactions:</strong> ${client.expectedTransactions || 'To be documented'}</p>
  </div>

  <div class="document-retention">
    <h2>Document Retention</h2>
    <p>All CDD documentation must be retained for a minimum of 5 years from the end of the 
    business relationship, in accordance with Regulation 40 of the Money Laundering, 
    Terrorist Financing and Transfer of Funds (Information on the Payer) Regulations 2017.</p>
  </div>
</body>
</html>`;
  }

  /**
   * Build Ongoing Monitoring document
   */
  private async buildOngoingMonitoringPDF(
    client: Client,
    riskAssessment: RiskAssessment,
    user: User
  ): Promise<string> {
    const styles = this.getStyles();
    const header = this.getHeader(user);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Ongoing Monitoring Plan - ${client.companyName}</title>
  <style>${styles}</style>
</head>
<body>
  ${header}
  
  <h1>Ongoing Monitoring Plan</h1>
  
  <div class="client-info">
    <p><strong>Client:</strong> ${client.companyName}</p>
    <p><strong>Risk Level:</strong> ${riskAssessment.overallRiskLevel}</p>
    <p><strong>Next Review Date:</strong> ${client.nextReviewDate?.toLocaleDateString('en-GB') || 'To be scheduled'}</p>
  </div>

  <div class="monitoring-requirements">
    <h2>Monitoring Requirements</h2>
    <pre>${riskAssessment.ongoingMonitoring}</pre>
  </div>

  <div class="review-schedule">
    <h2>Review Schedule</h2>
    <table>
      <tr>
        <th>Review Type</th>
        <th>Frequency</th>
        <th>Next Due</th>
        <th>Status</th>
      </tr>
      <tr>
        <td>Client Risk Assessment</td>
        <td>${riskAssessment.overallRiskLevel === 'HIGH' ? 'Quarterly' : riskAssessment.overallRiskLevel === 'MEDIUM' ? 'Annual' : 'Bi-annual'}</td>
        <td>${client.nextReviewDate?.toLocaleDateString('en-GB') || 'TBD'}</td>
        <td>Pending</td>
      </tr>
      <tr>
        <td>Sanctions Screening</td>
        <td>${riskAssessment.overallRiskLevel === 'HIGH' ? 'Quarterly' : 'Annual'}</td>
        <td>${client.nextReviewDate?.toLocaleDateString('en-GB') || 'TBD'}</td>
        <td>Pending</td>
      </tr>
      <tr>
        <td>PEP Screening</td>
        <td>${riskAssessment.overallRiskLevel === 'HIGH' ? 'Annual' : 'On renewal'}</td>
        <td>${client.nextReviewDate?.toLocaleDateString('en-GB') || 'TBD'}</td>
        <td>Pending</td>
      </tr>
    </table>
  </div>

  <div class="trigger-events">
    <h2>Trigger Events Requiring Immediate Review</h2>
    <ul>
      <li>Significant change in business activities or ownership</li>
      <li>Unusual or suspicious transactions</li>
      <li>Change in beneficial ownership</li>
      <li>Client requests unusual services</li>
      <li>Media reports of criminal activity</li>
      <li>Change in risk profile (e.g., new high-risk jurisdiction exposure)</li>
    </ul>
  </div>

  <div class="notes-section">
    <h2>Monitoring Notes</h2>
    <p>${client.monitoringNotes || 'No monitoring notes recorded.'}</p>
  </div>
</body>
</html>`;
  }

  /**
   * Get CSS styles for PDF
   */
  private getStyles(): string {
    return `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 11pt;
        line-height: 1.6;
        color: #1a1a1a;
      }
      
      h1 {
        font-size: 24pt;
        font-weight: 700;
        color: #1e3a5f;
        margin-bottom: 24pt;
        border-bottom: 3pt solid #1e3a5f;
        padding-bottom: 12pt;
      }
      
      h2 {
        font-size: 14pt;
        font-weight: 600;
        color: #1e3a5f;
        margin-top: 20pt;
        margin-bottom: 12pt;
      }
      
      h3 {
        font-size: 12pt;
        font-weight: 600;
        color: #333;
        margin-top: 16pt;
        margin-bottom: 8pt;
      }
      
      p {
        margin-bottom: 8pt;
      }
      
      ul, ol {
        margin-left: 20pt;
        margin-bottom: 12pt;
      }
      
      li {
        margin-bottom: 4pt;
      }
      
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 16pt 0;
      }
      
      th, td {
        padding: 8pt 12pt;
        text-align: left;
        border-bottom: 1pt solid #ddd;
      }
      
      th {
        background-color: #f5f5f5;
        font-weight: 600;
        color: #1e3a5f;
      }
      
      .cover-page {
        height: 100vh;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        page-break-after: always;
      }
      
      .cover-page h1 {
        font-size: 36pt;
        border: none;
        margin-bottom: 8pt;
      }
      
      .cover-page h2 {
        font-size: 20pt;
        font-weight: 400;
        color: #666;
        border: none;
        margin-top: 0;
      }
      
      .cover-company {
        margin-top: 60pt;
        padding: 24pt;
        background: #f8f9fa;
        border-radius: 8pt;
      }
      
      .cover-company h3 {
        font-size: 18pt;
        color: #1e3a5f;
        margin-bottom: 12pt;
      }
      
      .confidential {
        margin-top: 40pt;
        padding: 12pt 24pt;
        background: #dc3545;
        color: white;
        font-weight: 600;
        font-size: 10pt;
        border-radius: 4pt;
      }
      
      .page-break {
        page-break-after: always;
      }
      
      .toc {
        page-break-after: always;
      }
      
      .toc h2 {
        margin-bottom: 20pt;
      }
      
      .toc ul {
        list-style: none;
        margin-left: 0;
      }
      
      .toc li {
        padding: 8pt 0;
        border-bottom: 1pt dotted #ccc;
        display: flex;
        justify-content: space-between;
      }
      
      .risk-badge {
        display: inline-block;
        padding: 6pt 16pt;
        border-radius: 4pt;
        font-weight: 600;
        font-size: 10pt;
        text-transform: uppercase;
      }
      
      .risk-badge.low {
        background: #d4edda;
        color: #155724;
      }
      
      .risk-badge.medium {
        background: #fff3cd;
        color: #856404;
      }
      
      .risk-badge.high {
        background: #f8d7da;
        color: #721c24;
      }
      
      .risk-matrix {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12pt;
        margin: 16pt 0;
      }
      
      .risk-factor {
        padding: 12pt;
        background: #f8f9fa;
        border-radius: 4pt;
        border-left: 4pt solid #ddd;
      }
      
      .risk-factor.low { border-left-color: #28a745; }
      .risk-factor.medium { border-left-color: #ffc107; }
      .risk-factor.high { border-left-color: #dc3545; }
      .risk-factor.critical { border-left-color: #6f42c1; }
      
      .signature-section {
        margin-top: 30pt;
        padding: 20pt;
        background: #f8f9fa;
        border-radius: 4pt;
      }
      
      .signature-box {
        margin-top: 16pt;
      }
      
      .signature-box p {
        margin-bottom: 12pt;
      }
      
      .checklist-table td:first-child {
        width: 40%;
      }
      
      .ai-analysis {
        background: #f8f9fa;
        padding: 16pt;
        border-radius: 4pt;
        margin: 16pt 0;
      }
      
      .ai-analysis h3 {
        margin-top: 0;
      }
      
      pre {
        background: #f5f5f5;
        padding: 12pt;
        border-radius: 4pt;
        font-family: monospace;
        font-size: 10pt;
        white-space: pre-wrap;
        word-wrap: break-word;
      }
      
      @media print {
        body {
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
      }
    `;
  }

  /**
   * Get document header
   */
  private getHeader(user: User): string {
    return `
      <div class="header" style="margin-bottom: 20pt; padding-bottom: 10pt; border-bottom: 1pt solid #ddd;">
        <table style="width: 100%; border: none;">
          <tr>
            <td style="border: none;">
              <strong style="font-size: 12pt; color: #1e3a5f;">${user.firmName}</strong>
              <br><span style="font-size: 9pt; color: #666;">AML Compliance Documentation</span>
            </td>
            <td style="border: none; text-align: right;">
              <span style="font-size: 9pt; color: #666;">
                Generated: ${new Date().toLocaleDateString('en-GB')}
              </span>
            </td>
          </tr>
        </table>
      </div>
    `;
  }

  /**
   * Get document footer
   */
  private getFooter(): string {
    return `
      <div class="footer" style="margin-top: 30pt; padding-top: 10pt; border-top: 1pt solid #ddd; font-size: 8pt; color: #666; text-align: center;">
        <p>This document is confidential and prepared for compliance purposes only.</p>
        <p>Page <span class="pageNumber"></span> of <span class="totalPages"></span></p>
      </div>
    `;
  }

  /**
   * Get table of contents
   */
  private getTableOfContents(): string {
    return `
      <div class="toc">
        <h2>Table of Contents</h2>
        <ul>
          <li><span>1. Client Information</span> <span>3</span></li>
          <li><span>2. Risk Assessment</span> <span>4</span></li>
          <li><span>3. Customer Due Diligence</span> <span>6</span></li>
          <li><span>4. Ongoing Monitoring</span> <span>7</span></li>
          <li><span>5. Declarations</span> <span>8</span></li>
        </ul>
      </div>
    `;
  }

  /**
   * Get client information section
   */
  private getClientInformationSection(client: Client): string {
    const address = client.registeredAddress;
    const addressStr = address 
      ? `${address.addressLine1}${address.addressLine2 ? ', ' + address.addressLine2 : ''}, ${address.city}, ${address.postcode}, ${address.country}`
      : 'N/A';

    const officers = client.officers || [];
    const officersHtml = officers.length > 0
      ? officers.map(o => `
          <tr>
            <td>${o.name}</td>
            <td>${o.role}</td>
            <td>${o.appointedDate ? new Date(o.appointedDate).toLocaleDateString('en-GB') : 'N/A'}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="3">No officers recorded</td></tr>';

    const pscs = client.pscs || [];
    const pscsHtml = pscs.length > 0
      ? pscs.map(p => `
          <tr>
            <td>${p.name}</td>
            <td>${p.natureOfControl?.join(', ') || 'N/A'}</td>
            <td>${p.nationality || 'N/A'}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="3">No PSCs recorded</td></tr>';

    return `
      <section class="client-information">
        <h1>1. Client Information</h1>
        
        <h2>Company Details</h2>
        <table>
          <tr><td><strong>Company Name:</strong></td><td>${client.companyName}</td></tr>
          <tr><td><strong>Company Number:</strong></td><td>${client.companyNumber || 'N/A'}</td></tr>
          <tr><td><strong>Company Type:</strong></td><td>${client.companyType || 'N/A'}</td></tr>
          <tr><td><strong>Company Status:</strong></td><td>${client.companyStatus || 'N/A'}</td></tr>
          <tr><td><strong>Incorporation Date:</strong></td><td>${client.incorporationDate?.toLocaleDateString('en-GB') || 'N/A'}</td></tr>
          <tr><td><strong>Registered Address:</strong></td><td>${addressStr}</td></tr>
          <tr><td><strong>SIC Codes:</strong></td><td>${client.sicCodes?.join(', ') || 'N/A'}</td></tr>
          <tr><td><strong>Business Description:</strong></td><td>${client.businessDescription || 'N/A'}</td></tr>
        </table>

        <h2>Officers</h2>
        <table>
          <thead>
            <tr><th>Name</th><th>Role</th><th>Appointed Date</th></tr>
          </thead>
          <tbody>${officersHtml}</tbody>
        </table>

        <h2>Persons with Significant Control</h2>
        <table>
          <thead>
            <tr><th>Name</th><th>Nature of Control</th><th>Nationality</th></tr>
          </thead>
          <tbody>${pscsHtml}</tbody>
        </table>
      </section>
    `;
  }

  /**
   * Get risk assessment section
   */
  private getRiskAssessmentSection(riskAssessment: RiskAssessment): string {
    const riskFactors = riskAssessment.riskFactors || [];
    const riskFactorsHtml = riskFactors.length > 0
      ? riskFactors.map(f => `
          <div class="risk-factor ${f.risk.toLowerCase()}">
            <strong>${f.category}</strong>
            <span class="risk-badge ${f.risk.toLowerCase()}">${f.risk}</span>
            <p>${f.description}</p>
          </div>
        `).join('')
      : '<p>No specific risk factors identified.</p>';

    return `
      <section class="risk-assessment">
        <h1>2. Risk Assessment</h1>
        
        <div class="overall-risk" style="margin-bottom: 20pt;">
          <h2>Overall Risk Level</h2>
          <div class="risk-badge ${riskAssessment.overallRiskLevel.toLowerCase()}" style="font-size: 14pt; padding: 12pt 24pt;">
            ${riskAssessment.overallRiskLevel} RISK (Score: ${riskAssessment.riskScore}/100)
          </div>
        </div>

        <h2>Risk Factor Analysis</h2>
        <div class="risk-matrix">
          <div class="risk-factor ${riskAssessment.businessSectorRisk.toLowerCase()}">
            <strong>Business Sector</strong>
            <span class="risk-badge ${riskAssessment.businessSectorRisk.toLowerCase()}">${riskAssessment.businessSectorRisk}</span>
          </div>
          <div class="risk-factor ${riskAssessment.geographicRisk.toLowerCase()}">
            <strong>Geographic</strong>
            <span class="risk-badge ${riskAssessment.geographicRisk.toLowerCase()}">${riskAssessment.geographicRisk}</span>
          </div>
          <div class="risk-factor ${riskAssessment.structureRisk.toLowerCase()}">
            <strong>Structure</strong>
            <span class="risk-badge ${riskAssessment.structureRisk.toLowerCase()}">${riskAssessment.structureRisk}</span>
          </div>
          <div class="risk-factor ${riskAssessment.transparencyRisk.toLowerCase()}">
            <strong>Transparency</strong>
            <span class="risk-badge ${riskAssessment.transparencyRisk.toLowerCase()}">${riskAssessment.transparencyRisk}</span>
          </div>
          <div class="risk-factor ${riskAssessment.pepRisk.toLowerCase()}">
            <strong>PEP Risk</strong>
            <span class="risk-badge ${riskAssessment.pepRisk.toLowerCase()}">${riskAssessment.pepRisk}</span>
          </div>
          <div class="risk-factor ${riskAssessment.sanctionsRisk.toLowerCase()}">
            <strong>Sanctions</strong>
            <span class="risk-badge ${riskAssessment.sanctionsRisk.toLowerCase()}">${riskAssessment.sanctionsRisk}</span>
          </div>
        </div>

        <h2>Detailed Risk Factors</h2>
        ${riskFactorsHtml}

        <h2>Risk Mitigation Measures</h2>
        <ul>
          ${(riskAssessment.riskMitigation || []).map(m => `<li>${m}</li>`).join('')}
        </ul>

        <h2>Required Documentation</h2>
        <ul>
          ${(riskAssessment.requiredDocuments || []).map(d => `<li>${d}</li>`).join('')}
        </ul>

        <div class="ai-analysis">
          <h3>AI Analysis</h3>
          <pre>${riskAssessment.aiAnalysis || 'No AI analysis available.'}</pre>
          <p style="font-size: 9pt; color: #666; margin-top: 8pt;">
            Generated by ${riskAssessment.aiModel || 'AI'} on ${riskAssessment.aiGeneratedAt.toLocaleDateString('en-GB')}
          </p>
        </div>

        <h2>Risk Justification</h2>
        <p style="white-space: pre-wrap;">${riskAssessment.riskJustification || 'No justification provided.'}</p>
      </section>
    `;
  }

  /**
   * Get CDD section
   */
  private getCDDSection(client: Client, riskAssessment: RiskAssessment): string {
    return `
      <section class="cdd-section">
        <h1>3. Customer Due Diligence</h1>
        
        <h2>CDD Type Applied</h2>
        <div class="risk-badge ${riskAssessment.overallRiskLevel.toLowerCase()}" style="margin-bottom: 16pt;">
          ${client.cddType || riskAssessment.overallRiskLevel} DUE DILIGENCE
        </div>

        <h2>Identity Verification Status</h2>
        <table class="checklist-table">
          <tr>
            <th>Verification Item</th>
            <th>Status</th>
          </tr>
          <tr>
            <td>Company Incorporation</td>
            <td>${client.companyNumber ? '✓ Verified' : '✗ Not Verified'}</td>
          </tr>
          <tr>
            <td>Registered Address</td>
            <td>${client.addressVerified ? '✓ Verified' : '✗ Not Verified'}</td>
          </tr>
          <tr>
            <td>Director Identity</td>
            <td>${client.identityVerified ? '✓ Verified' : '✗ Not Verified'}</td>
          </tr>
          <tr>
            <td>Beneficial Ownership</td>
            <td>${client.pscs && client.pscs.length > 0 ? '✓ Identified' : '✗ Not Identified'}</td>
          </tr>
          <tr>
            <td>PEP Screening</td>
            <td>${client.pepScreened ? '✓ Screened' : '✗ Not Screened'}</td>
          </tr>
          <tr>
            <td>Sanctions Screening</td>
            <td>${client.sanctionsScreened ? '✓ Screened' : '✗ Not Screened'}</td>
          </tr>
        </table>

        <h2>Source of Funds / Wealth</h2>
        <table>
          <tr><td><strong>Source of Funds:</strong></td><td>${client.sourceOfFunds || 'To be documented'}</td></tr>
          <tr><td><strong>Source of Wealth:</strong></td><td>${client.sourceOfWealth || 'To be documented'}</td></tr>
          <tr><td><strong>Expected Transactions:</strong></td><td>${client.expectedTransactions || 'To be documented'}</td></tr>
        </table>

        <h2>Document Retention</h2>
        <p>In accordance with the Money Laundering, Terrorist Financing and Transfer of Funds 
        (Information on the Payer) Regulations 2017, all CDD records will be retained for a 
        minimum of 5 years from the end of the business relationship.</p>
      </section>
    `;
  }

  /**
   * Get ongoing monitoring section
   */
  private getOngoingMonitoringSection(riskAssessment: RiskAssessment): string {
    return `
      <section class="ongoing-monitoring">
        <h1>4. Ongoing Monitoring</h1>
        
        <h2>Monitoring Requirements</h2>
        <pre>${riskAssessment.ongoingMonitoring}</pre>

        <h2>Trigger Events</h2>
        <p>The following events will trigger an immediate review of the risk assessment:</p>
        <ul>
          <li>Significant change in business activities or ownership structure</li>
          <li>Unusual or suspicious transactions</li>
          <li>Change in beneficial ownership</li>
          <li>Request for unusual services</li>
          <li>Media reports suggesting criminal activity</li>
          <li>New exposure to high-risk jurisdictions</li>
        </ul>

        <h2>Record of Reviews</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Review Type</th>
              <th>Reviewer</th>
              <th>Findings</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${new Date().toLocaleDateString('en-GB')}</td>
              <td>Initial Assessment</td>
              <td>AI-Assisted</td>
              <td>${riskAssessment.overallRiskLevel} Risk assigned</td>
            </tr>
          </tbody>
        </table>
      </section>
    `;
  }

  /**
   * Get declaration section
   */
  private getDeclarationSection(client: Client, user: User): string {
    return `
      <section class="declarations">
        <h1>5. Declarations</h1>
        
        <h2>Client Declaration</h2>
        <p>I confirm that:</p>
        <ul>
          <li>The information provided is accurate and complete to the best of my knowledge</li>
          <li>I understand that ${user.firmName} is required to verify my identity and that of beneficial owners</li>
          <li>I will inform ${user.firmName} of any significant changes to the business</li>
          <li>I understand that suspicious activities may be reported to the authorities</li>
          <li>All funds are from legitimate sources</li>
        </ul>

        <div class="signature-box">
          <p><strong>Signed:</strong> _________________________________</p>
          <p><strong>Name:</strong> _________________________________</p>
          <p><strong>Position:</strong> _________________________________</p>
          <p><strong>Date:</strong> _________________________________</p>
        </div>

        <h2>Accountant Declaration</h2>
        <p>I confirm that:</p>
        <ul>
          <li>I have conducted appropriate due diligence on this client</li>
          <li>The risk assessment reflects the information available</li>
          <li>I have complied with AML regulations in onboarding this client</li>
          <li>I will maintain appropriate records for the required period</li>
        </ul>

        <div class="signature-box">
          <p><strong>Signed:</strong> _________________________________</p>
          <p><strong>Name:</strong> ${user.firstName} ${user.lastName}</p>
          <p><strong>Firm:</strong> ${user.firmName}</p>
          <p><strong>Date:</strong> _________________________________</p>
        </div>

        <h2>MLRO Review (if required)</h2>
        <p>For High Risk clients, the following MLRO review is required:</p>
        
        <div class="signature-box">
          <p><strong>MLRO Approval:</strong> _________________________________</p>
          <p><strong>MLRO Name:</strong> _________________________________</p>
          <p><strong>Date:</strong> _________________________________</p>
          <p><strong>Comments:</strong></p>
          <p style="border: 1pt solid #ccc; min-height: 60pt; padding: 8pt;"></p>
        </div>
      </section>
    `;
  }
}

export const pdfGenerationService = new PDFGenerationService();
