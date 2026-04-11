# AML Guardian Pro - Partner Marketplace

## Overview

The Partner Marketplace allows third-party software vendors to integrate with AML Guardian Pro, creating a rich ecosystem of connected compliance tools.

## Current Integrations

### Accounting Software
| Partner | Status | Features |
|---------|--------|----------|
| **Xero** | ✅ Available | Auto-sync, compliance blocking, risk assessment |
| **QuickBooks** | ✅ Available | Customer sync, automated screening |
| **Sage** | 🚧 Coming Q2 2024 | Planned |

### Practice Management
| Partner | Status | Features |
|---------|--------|----------|
| **Capstone Practice** | ✅ Available | Native integration |
| **Senta** | 🚧 Coming Q1 2024 | In development |
| **AccountancyManager** | 📋 Planned | On roadmap |

### Document Management
| Partner | Status | Features |
|---------|--------|----------|
| **DocuSign** | 🚧 Coming Q1 2024 | E-signature for CDD |
| **Adobe Sign** | 📋 Planned | On roadmap |

## Building an Integration

### 1. Get API Access

```javascript
// Sign up for developer account
const apiKey = await requestDeveloperAccount({
  company: 'Your Company',
  email: 'dev@yourcompany.com',
  integrationType: 'accounting_software',
});
```

### 2. Use Our SDK

```bash
npm install @aml-guardian/sdk
```

```javascript
import { AMLGuardian } from '@aml-guardian/sdk';

const aml = new AMLGuardian({
  apiKey: 'your_api_key',
  environment: 'production', // or 'sandbox'
});
```

### 3. Common Integration Patterns

#### Pattern A: Client Sync
Sync your users' clients with AML Guardian Pro:

```javascript
// When new client created in your system
const amlClient = await aml.clients.create({
  companyName: client.name,
  companyNumber: client.registrationNumber,
});

// Auto-trigger risk assessment
await aml.riskAssessments.generate(amlClient.id);

// Set up webhook for updates
await aml.webhooks.create({
  url: 'https://your-app.com/webhooks/aml',
  events: ['risk-assessment.completed', 'client.updated'],
});
```

#### Pattern B: Compliance Check
Check compliance before allowing actions:

```javascript
// Before creating invoice
const status = await aml.compliance.check(clientId);

if (!status.compliant) {
  // Show compliance checklist to user
  showComplianceModal(status.missingChecks);
  return;
}

// Proceed with invoice
createInvoice(data);
```

#### Pattern C: Embedded Widget
Embed AML status in your UI:

```html
<!-- Add AML status widget -->
<div id="aml-widget"></div>

<script src="https://cdn.amlguardian.pro/widget.js"></script>
<script>
  AMLWidget.init({
    apiKey: 'your_key',
    clientId: 'client_uuid',
    container: '#aml-widget',
  });
</script>
```

## Integration Certification

To become a certified partner:

1. **Register** as a developer
2. **Build** your integration using our SDK
3. **Test** in sandbox environment
4. **Submit** for review (we test security & UX)
5. **Launch** in marketplace

### Certification Requirements

- ✅ Secure API key handling
- ✅ Graceful error handling
- ✅ Clear user consent flows
- ✅ Privacy-compliant data handling
- ✅ Responsive UI (if applicable)

## Partner Benefits

### Revenue Share
- 20% commission on referred customers
- 10% lifetime recurring commission

### Marketing Support
- Featured placement in marketplace
- Co-branded marketing materials
- Joint case studies

### Technical Support
- Dedicated integration engineer
- Priority API support
- Early access to new features

## API Rate Limits for Partners

| Tier | Rate Limit | Price |
|------|-----------|-------|
| **Starter** | 1,000 req/hour | Free |
| **Professional** | 10,000 req/hour | £99/mo |
| **Enterprise** | Unlimited | Custom |

## Success Stories

### Capstone Proposal Software
> "Integrating AML Guardian Pro into our proposal workflow has been a game-changer. Our users can now check client compliance with one click, and we've seen a 40% reduction in onboarding time."
> — Sarah Johnson, Product Lead

**Results:**
- 2,500+ joint customers
- 40% faster client onboarding
- 15% increase in proposal win rate

### Xero Integration
> "The Xero integration automatically creates AML profiles for new clients. Our accounting firm users save 5+ hours per week on compliance admin."
> — Michael Chen, Integration Partner

**Results:**
- 5,000+ synced clients
- 5 hours/week saved per firm
- 95% customer satisfaction

## Getting Started

1. **Read** the [API Documentation](API_INTEGRATION_GUIDE.md)
2. **Request** sandbox access: partners@amlguardian.pro
3. **Join** our Partner Slack community
4. **Build** your integration
5. **Submit** for certification

## Support

- **Partner Support**: partners@amlguardian.pro
- **Technical Docs**: docs.amlguardian.pro
- **Slack Community**: partners.slack.com
- **Office Hours**: Tuesdays 2-4pm GMT

## Roadmap

### Q1 2024
- [ ] DocuSign integration launch
- [ ] Partner dashboard
- [ ] Revenue reporting API

### Q2 2024
- [ ] Sage integration
- [ ] Zapier connector
- [ ] Chrome extension

### Q3 2024
- [ ] Microsoft 365 integration
- [ ] HubSpot connector
- [ ] Salesforce app

---

**Join the ecosystem that's making compliance effortless for thousands of accountancy firms.**
