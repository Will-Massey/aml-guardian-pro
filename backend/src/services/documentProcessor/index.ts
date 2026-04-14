import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import fs from 'fs';
import { logger } from '../../utils/logger';

export interface ExtractedData {
  fullName?: string;
  dateOfBirth?: string;
  documentNumber?: string;
  expiryDate?: string;
  nationality?: string;
  address?: {
    street?: string;
    city?: string;
    postcode?: string;
    country?: string;
  };
  companyName?: string;
  companyNumber?: string;
  confidence: number;
}

/**
 * Process document image with OCR
 */
export async function processDocument(
  imagePath: string,
  documentType: 'passport' | 'driving_license' | 'utility_bill' | 'bank_statement' | 'certificate_of_incorporation'
): Promise<ExtractedData> {
  try {
    // Pre-process image for better OCR
    const processedImage = await preprocessImage(imagePath);
    
    // Perform OCR
    const { data: { text, confidence } } = await Tesseract.recognize(
      processedImage,
      'eng',
      {
        logger: (m) => logger.debug('OCR Progress', m),
      }
    );

    logger.info('OCR completed', { confidence, documentType });

    // Extract structured data based on document type
    const extractedData = extractStructuredData(text, documentType);
    extractedData.confidence = confidence;

    return extractedData;
  } catch (error) {
    logger.error('Document processing failed', error);
    throw new Error('Failed to process document');
  }
}

/**
 * Pre-process image for better OCR results
 */
async function preprocessImage(imagePath: string): Promise<Buffer> {
  try {
    const processed = await sharp(imagePath)
      .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
      .grayscale()
      .normalize()
      .sharpen(1, 1, 2)
      .toBuffer();
    
    return processed;
  } catch (error) {
    logger.warn('Image preprocessing failed, using original', error);
    // Return original if processing fails
    return fs.readFileSync(imagePath);
  }
}

/**
 * Extract structured data from OCR text
 */
function extractStructuredData(text: string, documentType: string): ExtractedData {
  const data: ExtractedData = { confidence: 0 };

  switch (documentType) {
    case 'passport':
      return extractPassportData(text);
    case 'driving_license':
      return extractDrivingLicenseData(text);
    case 'utility_bill':
      return extractUtilityBillData(text);
    case 'bank_statement':
      return extractBankStatementData(text);
    case 'certificate_of_incorporation':
      return extractCertificateData(text);
    default:
      return extractGenericData(text);
  }
}

/**
 * Extract passport data using regex patterns
 */
function extractPassportData(text: string): ExtractedData {
  const data: ExtractedData = { confidence: 0 };
  
  // Name patterns
  const nameMatch = text.match(/(?:Name|Surname|Given Names?)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
  if (nameMatch) {
    data.fullName = nameMatch[1].trim();
  }

  // Date of birth patterns
  const dobMatch = text.match(/(?:Date of Birth|DOB|Birth)[:\s]+(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})/i);
  if (dobMatch) {
    data.dateOfBirth = parseDate(dobMatch[1]);
  }

  // Passport number
  const passportMatch = text.match(/(?:Passport No|Number)[:\s]+([A-Z0-9]{6,9})/i);
  if (passportMatch) {
    data.documentNumber = passportMatch[1];
  }

  // Expiry date
  const expiryMatch = text.match(/(?:Expiry|Expiration|Date of Expiry)[:\s]+(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})/i);
  if (expiryMatch) {
    data.expiryDate = parseDate(expiryMatch[1]);
  }

  // Nationality
  const nationalityMatch = text.match(/(?:Nationality|Citizen)[:\s]+([A-Za-z\s]+)/i);
  if (nationalityMatch) {
    data.nationality = nationalityMatch[1].trim();
  }

  return data;
}

/**
 * Extract driving license data
 */
function extractDrivingLicenseData(text: string): ExtractedData {
  const data: ExtractedData = { confidence: 0 };
  
  // Name
  const nameMatch = text.match(/(?:Name|Driver)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
  if (nameMatch) {
    data.fullName = nameMatch[1].trim();
  }

  // DOB
  const dobMatch = text.match(/(?:Date of Birth|DOB)[:\s]+(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})/i);
  if (dobMatch) {
    data.dateOfBirth = parseDate(dobMatch[1]);
  }

  // License number
  const licenseMatch = text.match(/(?:License|Number|No\.)[:\s]+([A-Z0-9]{6,16})/i);
  if (licenseMatch) {
    data.documentNumber = licenseMatch[1];
  }

  // Address
  const address = extractAddress(text);
  if (address) {
    data.address = address;
  }

  return data;
}

/**
 * Extract utility bill data
 */
function extractUtilityBillData(text: string): ExtractedData {
  const data: ExtractedData = { confidence: 0 };
  
  // Account holder name
  const nameMatch = text.match(/(?:Bill to|Customer|Account Holder)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
  if (nameMatch) {
    data.fullName = nameMatch[1].trim();
  }

  // Address
  const address = extractAddress(text);
  if (address) {
    data.address = address;
  }

  return data;
}

/**
 * Extract bank statement data
 */
function extractBankStatementData(text: string): ExtractedData {
  const data: ExtractedData = { confidence: 0 };
  
  // Account holder
  const nameMatch = text.match(/(?:Account Holder|Customer Name)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
  if (nameMatch) {
    data.fullName = nameMatch[1].trim();
  }

  // Address
  const address = extractAddress(text);
  if (address) {
    data.address = address;
  }

  return data;
}

/**
 * Extract certificate of incorporation data
 */
function extractCertificateData(text: string): ExtractedData {
  const data: ExtractedData = { confidence: 0 };
  
  // Company name
  const companyMatch = text.match(/(?:Company Name|Name of Company)[:\s]+([A-Z][A-Za-z0-9\s&.,]+(?:Limited|Ltd|PLC|LLP))/i);
  if (companyMatch) {
    data.companyName = companyMatch[1].trim();
  }

  // Company number
  const numberMatch = text.match(/(?:Company Number|Registration Number|No\.)[:\s]+([A-Z0-9]{6,8})/i);
  if (numberMatch) {
    data.companyNumber = numberMatch[1];
  }

  return data;
}

/**
 * Extract generic data
 */
function extractGenericData(text: string): ExtractedData {
  const data: ExtractedData = { confidence: 0 };
  
  // Try to find name
  const nameMatch = text.match(/(?:Name|Full Name)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i);
  if (nameMatch) {
    data.fullName = nameMatch[1].trim();
  }

  // Try to find address
  const address = extractAddress(text);
  if (address) {
    data.address = address;
  }

  return data;
}

/**
 * Extract address from text
 */
function extractAddress(text: string): { street?: string; city?: string; postcode?: string; country?: string } | undefined {
  // UK Postcode pattern
  const postcodeMatch = text.match(/([A-Z]{1,2}\d[A-Z\d]?\s?\d[ABD-HJLNP-UW-Zabd-hjlnp-uw-z]{2})/i);
  
  if (postcodeMatch) {
    const postcode = postcodeMatch[1];
    
    // Look for street address before postcode
    const lines = text.split('\n');
    let street = '';
    let city = '';
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(postcode)) {
        // Get previous lines for address
        street = lines[i - 2]?.trim() || '';
        city = lines[i - 1]?.trim() || '';
        break;
      }
    }

    return {
      street,
      city,
      postcode,
      country: 'United Kingdom',
    };
  }

  return undefined;
}

/**
 * Parse date string to ISO format
 */
function parseDate(dateStr: string): string | undefined {
  try {
    // Try common formats
    const formats = [
      /(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/,
      /(\d{2})(\d{2})(\d{4})/,
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        const [, day, month, year] = match;
        const fullYear = year.length === 2 ? (parseInt(year) > 50 ? '19' : '20') + year : year;
        return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
  } catch (error) {
    logger.warn('Date parsing failed', { dateStr });
  }
  return undefined;
}

/**
 * Verify document authenticity (basic checks)
 */
export async function verifyDocumentAuthenticity(
  imagePath: string
): Promise<{
  isAuthentic: boolean;
  confidence: number;
  checks: {
    resolution: boolean;
    notPhotocopy: boolean;
    noDigitalArtifacts: boolean;
  };
}> {
  try {
    const metadata = await sharp(imagePath).metadata();
    
    // Check resolution
    const minResolution = 300; // DPI equivalent
    const resolution = Math.max(metadata.density || 72, 72);
    const resolutionCheck = resolution >= minResolution;

    // Check for photocopy indicators (simplified)
    const stats = await sharp(imagePath).stats();
    const notPhotocopy = stats.entropy > 5; // Higher entropy = more detail

    // Basic check for digital artifacts (simplified)
    const noDigitalArtifacts = metadata.format !== 'webp' && metadata.format !== 'gif';

    const checks = {
      resolution: resolutionCheck,
      notPhotocopy,
      noDigitalArtifacts,
    };

    const passedChecks = Object.values(checks).filter(Boolean).length;
    const confidence = (passedChecks / Object.keys(checks).length) * 100;

    return {
      isAuthentic: passedChecks >= 2,
      confidence,
      checks,
    };
  } catch (error) {
    logger.error('Document authenticity check failed', error);
    return {
      isAuthentic: false,
      confidence: 0,
      checks: {
        resolution: false,
        notPhotocopy: false,
        noDigitalArtifacts: false,
      },
    };
  }
}
