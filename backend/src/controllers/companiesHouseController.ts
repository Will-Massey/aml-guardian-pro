import { Request, Response, NextFunction } from 'express';
import { companiesHouseService } from '../services/companiesHouse';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';

/**
 * Search for companies
 */
export async function searchCompanies(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      throw createError('Search query required', 400, 'MISSING_QUERY');
    }

    const results = await companiesHouseService.searchCompanies(q, 20);

    res.json({
      success: true,
      data: results.map(company => ({
        companyNumber: company.company_number,
        companyName: company.company_name,
        companyStatus: company.company_status,
        companyType: company.company_type,
        dateOfCreation: company.date_of_creation,
        address: company.address ? {
          addressLine1: company.address.address_line_1,
          addressLine2: company.address.address_line_2,
          city: company.address.locality,
          postcode: company.address.postal_code,
          country: company.address.country,
        } : null,
      })),
      meta: {
        query: q,
        count: results.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get company details
 */
export async function getCompanyDetails(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { number } = req.params;

    if (!number) {
      throw createError('Company number required', 400, 'MISSING_COMPANY_NUMBER');
    }

    const company = await companiesHouseService.getCompanyDetails(number);

    if (!company) {
      throw createError('Company not found', 404, 'COMPANY_NOT_FOUND');
    }

    res.json({
      success: true,
      data: {
        companyNumber: company.company_number,
        companyName: company.company_name,
        companyStatus: company.company_status,
        companyType: company.company_type,
        dateOfCreation: company.date_of_creation,
        registeredOfficeAddress: company.registered_office_address ? {
          addressLine1: company.registered_office_address.address_line_1,
          addressLine2: company.registered_office_address.address_line_2,
          city: company.registered_office_address.locality,
          county: company.registered_office_address.region,
          postcode: company.registered_office_address.postal_code,
          country: company.registered_office_address.country,
        } : null,
        sicCodes: company.sic_codes || [],
        accounts: company.accounts ? {
          nextDue: company.accounts.next_due,
          overdue: company.accounts.overdue,
        } : null,
        confirmationStatement: company.confirmation_statement ? {
          nextDue: company.confirmation_statement.next_due,
          overdue: company.confirmation_statement.overdue,
        } : null,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get company officers
 */
export async function getCompanyOfficers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { number } = req.params;

    if (!number) {
      throw createError('Company number required', 400, 'MISSING_COMPANY_NUMBER');
    }

    const officers = await companiesHouseService.getCompanyOfficers(number);

    res.json({
      success: true,
      data: officers.map(officer => ({
        name: officer.name,
        role: officer.role,
        appointedDate: officer.appointedDate,
        resignedDate: officer.resignedDate,
        dateOfBirth: officer.dateOfBirth,
        nationality: officer.nationality,
        occupation: officer.occupation,
        address: officer.address,
      })),
      meta: {
        count: officers.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get company PSCs
 */
export async function getCompanyPSCs(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { number } = req.params;

    if (!number) {
      throw createError('Company number required', 400, 'MISSING_COMPANY_NUMBER');
    }

    const pscs = await companiesHouseService.getCompanyPSCs(number);

    res.json({
      success: true,
      data: pscs.map(psc => ({
        name: psc.name,
        natureOfControl: psc.natureOfControl,
        notifiedDate: psc.notifiedDate,
        ceasedDate: psc.ceasedDate,
        dateOfBirth: psc.dateOfBirth,
        nationality: psc.nationality,
        address: psc.address,
      })),
      meta: {
        count: pscs.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get full company profile
 */
export async function getFullCompanyProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { number } = req.params;

    if (!number) {
      throw createError('Company number required', 400, 'MISSING_COMPANY_NUMBER');
    }

    const profile = await companiesHouseService.getFullCompanyProfile(number);

    if (!profile.company) {
      throw createError('Company not found', 404, 'COMPANY_NOT_FOUND');
    }

    // Get SIC code descriptions
    const sicDescriptions = (profile.company.sic_codes || []).map(code => ({
      code,
      description: companiesHouseService.getSICCodeDescription(code),
    }));

    res.json({
      success: true,
      data: {
        company: profile.company ? {
          companyNumber: profile.company.company_number,
          companyName: profile.company.company_name,
          companyStatus: profile.company.company_status,
          companyType: profile.company.company_type,
          dateOfCreation: profile.company.date_of_creation,
          registeredOfficeAddress: profile.company.registered_office_address ? {
            addressLine1: profile.company.registered_office_address.address_line_1,
            addressLine2: profile.company.registered_office_address.address_line_2,
            city: profile.company.registered_office_address.locality,
            county: profile.company.registered_office_address.region,
            postcode: profile.company.registered_office_address.postal_code,
            country: profile.company.registered_office_address.country,
          } : null,
          sicCodes: profile.company.sic_codes || [],
          sicDescriptions,
        } : null,
        officers: profile.officers.map(o => ({
          name: o.name,
          role: o.role,
          appointedDate: o.appointedDate,
          resignedDate: o.resignedDate,
          dateOfBirth: o.dateOfBirth,
          nationality: o.nationality,
          occupation: o.occupation,
          address: o.address,
        })),
        pscs: profile.pscs.map(p => ({
          name: p.name,
          natureOfControl: p.natureOfControl,
          notifiedDate: p.notifiedDate,
          ceasedDate: p.ceasedDate,
          dateOfBirth: p.dateOfBirth,
          nationality: p.nationality,
          address: p.address,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}
