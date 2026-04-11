import axios from 'axios';
import { logger } from '../../utils/logger';

interface ScreeningResult {
  name: string;
  match: boolean;
  listType?: 'PEP' | 'SANCTION' | 'WATCHLIST';
  matchScore?: number;
  details?: {
    country?: string;
    position?: string;
    listName?: string;
    listedDate?: string;
  };
}

/**
 * Screen a name against PEP and Sanctions lists
 * In production, this would integrate with Dow Jones, WorldCheck, or Sanctions.io
 */
export async function screenName(
  name: string,
  birthYear?: number,
  country?: string
): Promise<ScreeningResult[]> {
  try {
    // Check if Sanctions.io API key is available (free tier available)
    const apiKey = process.env.SANCTIONS_API_KEY;
    
    if (apiKey) {
      // Real API call to Sanctions.io
      const response = await axios.get('https://api.sanctions.io/v2/search', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
        params: {
          query: name,
          ...(birthYear && { birth_year: birthYear }),
          ...(country && { country }),
        },
      });

      return response.data.results.map((result: any) => ({
        name: result.name,
        match: result.score > 0.8,
        listType: result.type === 'pep' ? 'PEP' : 'SANCTION',
        matchScore: result.score,
        details: {
          country: result.country,
          position: result.position,
          listName: result.list_name,
          listedDate: result.listed_date,
        },
      }));
    }

    // Fallback: Mock screening for demonstration
    return performMockScreening(name);
  } catch (error) {
    logger.error('Screening API error', error);
    // Return mock results on API failure
    return performMockScreening(name);
  }
}

/**
 * Mock screening for demonstration
 * In production, replace with real API
 */
function performMockScreening(name: string): ScreeningResult[] {
  const results: ScreeningResult[] = [];
  const lowerName = name.toLowerCase();

  // Mock PEP database (very simplified)
  const mockPEPs: Record<string, any> = {
    'putin': { country: 'Russia', position: 'President' },
    'lukashenko': { country: 'Belarus', position: 'President' },
    'kim jong': { country: 'North Korea', position: 'Supreme Leader' },
    'assad': { country: 'Syria', position: 'President' },
  };

  // Mock Sanctions database
  const mockSanctions: Record<string, any> = {
    'bin laden': { country: 'Saudi Arabia', listName: 'UN Consolidated List' },
    'al-baghdadi': { country: 'Iraq', listName: 'UN Consolidated List' },
  };

  // Check for PEP matches
  for (const [pattern, data] of Object.entries(mockPEPs)) {
    if (lowerName.includes(pattern)) {
      results.push({
        name,
        match: true,
        listType: 'PEP',
        matchScore: 0.95,
        details: {
          country: data.country,
          position: data.position,
          listName: 'Politically Exposed Persons Database',
        },
      });
    }
  }

  // Check for Sanctions matches
  for (const [pattern, data] of Object.entries(mockSanctions)) {
    if (lowerName.includes(pattern)) {
      results.push({
        name,
        match: true,
        listType: 'SANCTION',
        matchScore: 0.98,
        details: {
          country: data.country,
          listName: data.listName,
        },
      });
    }
  }

  // If no matches, return negative result
  if (results.length === 0) {
    results.push({
      name,
      match: false,
    });
  }

  return results;
}

/**
 * Screen a client (company and officers)
 */
export async function screenClient(
  companyName: string,
  officers: { name: string; nationality?: string }[] = [],
  pscs: { name: string; nationality?: string }[] = []
): Promise<{
  companyScreening: ScreeningResult[];
  officerScreening: ScreeningResult[];
  pscScreening: ScreeningResult[];
  hasMatches: boolean;
}> {
  const [companyResults, officerResults, pscResults] = await Promise.all([
    screenName(companyName),
    Promise.all(officers.map(o => screenName(o.name, undefined, o.nationality))).then(r => r.flat()),
    Promise.all(pscs.map(p => screenName(p.name, undefined, p.nationality))).then(r => r.flat()),
  ]);

  const hasMatches = 
    companyResults.some(r => r.match) ||
    officerResults.some(r => r.match) ||
    pscResults.some(r => r.match);

  return {
    companyScreening: companyResults,
    officerScreening: officerResults,
    pscScreening: pscResults,
    hasMatches,
  };
}
