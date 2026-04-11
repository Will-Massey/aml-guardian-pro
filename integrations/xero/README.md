# Xero Integration for AML Guardian Pro

## Overview

This integration automatically syncs clients between Xero and AML Guardian Pro, ensuring your accounting practice maintains AML compliance for all clients.

## Features

- **Auto-sync**: New Xero contacts automatically create AML clients
- **Two-way sync**: Updates flow in both directions
- **Compliance check**: Block Xero invoicing for non-compliant clients
- **Risk assessment**: Auto-generate risk profiles for new clients

## Installation

```bash
npm install @capstone/aml-xero-integration
```

## Quick Start

```javascript
const { XeroAMLIntegration } = require('@capstone/aml-xero-integration');

const integration = new XeroAMLIntegration({
  xero: {
    clientId: process.env.XERO_CLIENT_ID,
    clientSecret: process.env.XERO_CLIENT_SECRET,
  },
  aml: {
    apiKey: process.env.AML_API_KEY,
  },
});

// Sync all contacts
await integration.syncContacts();
```

## API Reference

See full documentation at [docs.capstone.com/integrations/xero](https://docs.capstone.com)
