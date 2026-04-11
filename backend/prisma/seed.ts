import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create test user
  const hashedPassword = await bcrypt.hash('Test1234!', 10);
  
  const user = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      firmName: 'Test Accountancy Firm',
      firmAddress: '123 Test Street, London, EC1A 1BB',
      firmPhone: '+44 20 7946 0958',
      firmEmail: 'admin@testfirm.com',
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log('✅ Test user created:', user.email);

  // Create test clients
  const clients = await Promise.all([
    prisma.client.upsert({
      where: { companyNumber: '09482394' },
      update: {},
      create: {
        companyName: 'CAPSTONE ACCOUNTANCY LIMITED',
        companyNumber: '09482394',
        companyStatus: 'ACTIVE',
        companyType: 'Private Limited Company',
        incorporationDate: new Date('2015-03-15'),
        registeredAddress: {
          address_line_1: '123 Test Street',
          locality: 'London',
          postal_code: 'EC1A 1BB',
          country: 'United Kingdom',
        },
        sicCodes: ['69201', '69202'],
        businessDescription: 'Accounting and auditing activities',
        riskLevel: 'MEDIUM',
        cddType: 'STANDARD',
        userId: user.id,
        createdBy: user.id,
        updatedBy: user.id,
        identityVerified: false,
        addressVerified: false,
        pepScreened: false,
        sanctionsScreened: false,
      },
    }),
    prisma.client.upsert({
      where: { companyNumber: '09902762' },
      update: {},
      create: {
        companyName: 'TECH STARTUP LTD',
        companyNumber: '09902762',
        companyStatus: 'ACTIVE',
        companyType: 'Private Limited Company',
        incorporationDate: new Date('2016-01-10'),
        registeredAddress: {
          address_line_1: '45 Innovation Way',
          locality: 'Manchester',
          postal_code: 'M1 1AA',
          country: 'United Kingdom',
        },
        sicCodes: ['62012'],
        businessDescription: 'Business and domestic software development',
        riskLevel: 'LOW',
        cddType: 'SIMPLIFIED',
        userId: user.id,
        createdBy: user.id,
        updatedBy: user.id,
        identityVerified: true,
        addressVerified: true,
        pepScreened: true,
        sanctionsScreened: true,
      },
    }),
    prisma.client.upsert({
      where: { companyNumber: 'TEST001' },
      update: {},
      create: {
        companyName: 'HIGH RISK TRADING LTD',
        companyNumber: 'TEST001',
        companyStatus: 'ACTIVE',
        companyType: 'Private Limited Company',
        incorporationDate: new Date('2020-06-01'),
        registeredAddress: {
          address_line_1: 'Suite 100',
          address_line_2: 'Offshore Centre',
          locality: 'Belize City',
          country: 'Belize',
        },
        sicCodes:['46190'],
        businessDescription: 'Agents involved in the sale of a variety of goods',
        riskLevel: 'HIGH',
        cddType: 'ENHANCED',
        userId: user.id,
        createdBy: user.id,
        updatedBy: user.id,
        identityVerified: false,
        addressVerified: false,
        pepScreened: false,
        sanctionsScreened: false,
      },
    }),
  ]);

  console.log('✅ Test clients created:', clients.length);

  // Create risk assessments for clients
  const riskAssessments = await Promise.all([
    prisma.riskAssessment.create({
      data: {
        overallRiskLevel: 'MEDIUM',
        riskScore: 45,
        businessSectorRisk: 'MEDIUM',
        geographicRisk: 'LOW',
        structureRisk: 'MEDIUM',
        transparencyRisk: 'LOW',
        pepRisk: 'LOW',
        sanctionsRisk: 'LOW',
        riskFactors: {
          businessSector: 'Standard accountancy services',
          geographic: 'UK based, low risk jurisdiction',
          structure: 'Simple ownership structure',
          transparency: 'Full Companies House filings',
        },
        riskMitigation: [
          'Standard CDD procedures',
          'Annual review required',
          'Monitor for changes in ownership',
        ],
        requiredDocuments: [
          'ID Verification - Director',
          'Address Verification - Director',
          'Company incorporation documents',
        ],
        ongoingMonitoring: 'Annual review and transaction monitoring',
        aiAnalysis: 'This UK-based accountancy firm presents standard risk profile. Regular filings and transparent ownership structure. Recommend standard CDD.',
        aiModel: 'claude-3-opus-20240229',
      },
    }),
  ]);

  // Link risk assessment to first client
  await prisma.client.update({
    where: { id: clients[0].id },
    data: { riskAssessmentId: riskAssessments[0].id },
  });

  console.log('✅ Risk assessments created');

  // Create test documents
  const documents = await Promise.all([
    prisma.document.create({
      data: {
        name: 'Certificate of Incorporation',
        type: 'ID_VERIFICATION',
        description: 'Company registration document',
        fileName: 'incorporation.pdf',
        filePath: '/uploads/test/incorporation.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        status: 'VERIFIED',
        clientId: clients[0].id,
        userId: user.id,
      },
    }),
    prisma.document.create({
      data: {
        name: 'Director Passport',
        type: 'ID_VERIFICATION',
        description: 'Passport for KYC verification',
        fileName: 'passport.pdf',
        filePath: '/uploads/test/passport.pdf',
        fileSize: 2048,
        mimeType: 'application/pdf',
        status: 'PENDING_VERIFICATION',
        clientId: clients[0].id,
        userId: user.id,
      },
    }),
  ]);

  console.log('✅ Test documents created:', documents.length);

  // Create API key
  const apiKey = await prisma.apiKey.create({
    data: {
      key: 'test_api_key_' + Math.random().toString(36).substring(2),
      name: 'Test Integration',
      userId: user.id,
      isActive: true,
    },
  });

  console.log('✅ Test API key created');

  // Create webhook
  const webhook = await prisma.webhook.create({
    data: {
      url: 'https://webhook.site/test-webhook',
      events: ['client.created', 'document.verified'],
      userId: user.id,
      isActive: true,
    },
  });

  console.log('✅ Test webhook created');

  // Create audit logs
  await prisma.auditLog.createMany({
    data: [
      {
        action: 'LOGIN',
        entityType: 'USER',
        entityId: user.id,
        description: 'User logged in',
        userId: user.id,
      },
      {
        action: 'CREATE',
        entityType: 'CLIENT',
        entityId: clients[0].id,
        description: 'Created client: CAPSTONE ACCOUNTANCY LIMITED',
        userId: user.id,
      },
    ],
  });

  console.log('✅ Audit logs created');

  console.log('\n🎉 Database seed completed successfully!');
  console.log('\nTest credentials:');
  console.log('  Email: admin@example.com');
  console.log('  Password: Test1234!');
  console.log('\nTest clients:');
  clients.forEach(c => console.log(`  - ${c.companyName} (${c.riskLevel} risk)`));
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
