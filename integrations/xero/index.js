/**
 * Xero Integration for AML Guardian Pro
 * 
 * This module provides seamless integration between Xero Accounting
 * and AML Guardian Pro for automated compliance management.
 */

const axios = require('axios');
const EventEmitter = require('events');

class XeroAMLIntegration extends EventEmitter {
  constructor(config) {
    super();
    this.config = {
      xero: config.xero,
      aml: {
        baseUrl: config.aml.baseUrl || 'http://localhost:3001/api/v1',
        apiKey: config.aml.apiKey,
      },
      sync: {
        autoCreateClients: config.sync?.autoCreateClients ?? true,
        autoScreenClients: config.sync?.autoScreenClients ?? true,
        ...config.sync,
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
   * Sync Xero contacts to AML Guardian Pro
   */
  async syncContacts(options = {}) {
    try {
      // Fetch contacts from Xero
      const xeroContacts = await this.fetchXeroContacts(options);
      
      const results = {
        created: 0,
        updated: 0,
        failed: 0,
        errors: [],
      };

      for (const contact of xeroContacts) {
        try {
          // Check if client exists in AML
          const existingClient = await this.findAMLClient(contact.taxNumber);
          
          if (existingClient) {
            // Update existing client
            await this.updateAMLClient(existingClient.id, contact);
            results.updated++;
          } else if (this.config.sync.autoCreateClients) {
            // Create new client
            const newClient = await this.createAMLClient(contact);
            results.created++;
            
            // Auto-screen if enabled
            if (this.config.sync.autoScreenClients) {
              await this.screenClient(newClient.id);
            }
            
            this.emit('client.synced', {
              xeroContactId: contact.contactID,
              amlClientId: newClient.id,
              companyName: contact.name,
            });
          }
        } catch (error) {
          results.failed++;
          results.errors.push({
            contact: contact.name,
            error: error.message,
          });
        }
      }

      return results;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Fetch contacts from Xero API
   */
  async fetchXeroContacts(options = {}) {
    // This would integrate with Xero Node SDK
    // Placeholder for actual implementation
    console.log('Fetching Xero contacts...');
    return [];
  }

  /**
   * Find AML client by company number
   */
  async findAMLClient(companyNumber) {
    if (!companyNumber) return null;
    
    try {
      const response = await this.amlClient.get(`/clients/lookup/${companyNumber}`);
      return response.data.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Create AML client from Xero contact
   */
  async createAMLClient(xeroContact) {
    const response = await this.amlClient.post('/clients', {
      companyName: xeroContact.name,
      companyNumber: xeroContact.taxNumber,
      email: xeroContact.emailAddress,
      registeredAddress: xeroContact.addresses?.[0],
    });
    
    return response.data.data;
  }

  /**
   * Update existing AML client
   */
  async updateAMLClient(clientId, xeroContact) {
    const response = await this.amlClient.put(`/clients/${clientId}`, {
      companyName: xeroContact.name,
      email: xeroContact.emailAddress,
      registeredAddress: xeroContact.addresses?.[0],
    });
    
    return response.data.data;
  }

  /**
   * Trigger PEP/Sanctions screening
   */
  async screenClient(clientId) {
    const response = await this.amlClient.post(`/clients/${clientId}/screen`);
    return response.data.data;
  }

  /**
   * Get compliance status for Xero contact
   */
  async getComplianceStatus(xeroContactId) {
    // Find the AML client linked to this Xero contact
    const amlClient = await this.findAMLClientByXeroId(xeroContactId);
    
    if (!amlClient) {
      return { compliant: false, error: 'Client not found in AML system' };
    }
    
    const response = await this.amlClient.get(
      `/clients/${amlClient.id}/compliance-status`
    );
    
    return response.data.data;
  }

  /**
   * Find AML client by Xero contact ID
   */
  async findAMLClientByXeroId(xeroContactId) {
    // This would typically use a mapping table
    // Placeholder implementation
    return null;
  }

  /**
   * Handle Xero webhooks
   */
  async handleWebhook(event) {
    switch (event.eventType) {
      case 'CONTACT.CREATED':
        if (this.config.sync.autoCreateClients) {
          await this.createAMLClient(event.data);
        }
        break;
        
      case 'CONTACT.UPDATED':
        const existing = await this.findAMLClientByXeroId(event.data.contactID);
        if (existing) {
          await this.updateAMLClient(existing.id, event.data);
        }
        break;
        
      default:
        console.log('Unhandled webhook event:', event.eventType);
    }
  }

  /**
   * Middleware to require compliance before action
   */
  requireCompliance(options = {}) {
    return async (req, res, next) => {
      try {
        const xeroContactId = req.body.contactId || req.params.contactId;
        
        if (!xeroContactId) {
          return res.status(400).json({
            error: 'Xero contact ID required',
          });
        }
        
        const status = await this.getComplianceStatus(xeroContactId);
        
        if (!status.compliant) {
          this.emit('compliance.failed', {
            xeroContactId,
            status,
          });
          
          return res.status(403).json({
            error: 'Client not AML compliant',
            status,
            missing: status.checks,
          });
        }
        
        req.amlCompliance = status;
        next();
      } catch (error) {
        next(error);
      }
    };
  }
}

module.exports = { XeroAMLIntegration };
