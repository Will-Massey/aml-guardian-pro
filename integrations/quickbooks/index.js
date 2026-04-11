/**
 * QuickBooks Integration for AML Guardian Pro
 * 
 * Automated AML compliance for QuickBooks customers
 */

const axios = require('axios');
const EventEmitter = require('events');

class QuickBooksAMLIntegration extends EventEmitter {
  constructor(config) {
    super();
    this.config = {
      quickbooks: config.quickbooks,
      aml: {
        baseUrl: config.aml.baseUrl || 'http://localhost:3001/api/v1',
        apiKey: config.aml.apiKey,
      },
    };
    
    this.amlClient = axios.create({
      baseURL: this.config.aml.baseUrl,
      headers: {
        'X-API-Key': this.config.aml.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Sync QuickBooks customers to AML
   */
  async syncCustomers(options = {}) {
    const customers = await this.fetchQuickBooksCustomers(options);
    
    const results = {
      created: 0,
      updated: 0,
      failed: 0,
    };

    for (const customer of customers) {
      try {
        const amlData = this.transformCustomerToAML(customer);
        
        // Check if exists
        const existing = await this.findAMLClient(customer.CompanyName);
        
        if (existing) {
          await this.amlClient.put(`/clients/${existing.id}`, amlData);
          results.updated++;
        } else {
          const newClient = await this.amlClient.post('/clients', amlData);
          results.created++;
          
          // Trigger risk assessment
          await this.amlClient.post(`/clients/${newClient.data.id}/risk-assessment`);
          
          this.emit('customer.synced', {
            qbCustomerId: customer.Id,
            amlClientId: newClient.data.id,
          });
        }
      } catch (error) {
        results.failed++;
        this.emit('error', { customer: customer.CompanyName, error });
      }
    }

    return results;
  }

  /**
   * Transform QuickBooks customer to AML format
   */
  transformCustomerToAML(customer) {
    return {
      companyName: customer.CompanyName || customer.DisplayName,
      companyNumber: customer.Taxable ? customer.TaxRegistrationNumber : null,
      email: customer.PrimaryEmailAddr?.value,
      registeredAddress: customer.BillAddr ? {
        addressLine1: customer.BillAddr.Line1,
        city: customer.BillAddr.City,
        postcode: customer.BillAddr.PostalCode,
        country: customer.BillAddr.Country || 'United Kingdom',
      } : undefined,
    };
  }

  async fetchQuickBooksCustomers(options) {
    // Integration with QuickBooks Node SDK
    console.log('Fetching QuickBooks customers...');
    return [];
  }

  async findAMLClient(companyName) {
    if (!companyName) return null;
    
    try {
      const response = await this.amlClient.get('/clients', {
        params: { search: companyName },
      });
      
      return response.data.data?.[0] || null;
    } catch (error) {
      return null;
    }
  }
}

module.exports = { QuickBooksAMLIntegration };
