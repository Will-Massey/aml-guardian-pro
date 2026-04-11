import nodemailer from 'nodemailer';
import { config } from '../../config';
import { logger } from '../../utils/logger';

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send email
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    // If no SMTP configured, log and return (for dev)
    if (!process.env.SMTP_USER) {
      logger.info('Email would be sent (SMTP not configured):', { to: options.to, subject: options.subject });
      return;
    }

    await transporter.sendMail({
      from: `"AML Guardian Pro" <${process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    logger.info('Email sent', { to: options.to, subject: options.subject });
  } catch (error) {
    logger.error('Failed to send email', error);
    throw error;
  }
}

/**
 * Document expiry reminder email
 */
export async function sendDocumentExpiryReminder(
  to: string,
  userName: string,
  clientName: string,
  documentName: string,
  daysUntilExpiry: number
): Promise<void> {
  const subject = `Document Expiry Reminder - ${daysUntilExpiry} days remaining`;
  const html = `
    <h2>AML Guardian Pro - Document Expiry Reminder</h2>
    <p>Hello ${userName},</p>
    <p>This is a reminder that a document for your client is expiring soon:</p>
    <ul>
      <li><strong>Client:</strong> ${clientName}</li>
      <li><strong>Document:</strong> ${documentName}</li>
      <li><strong>Days Remaining:</strong> ${daysUntilExpiry}</li>
    </ul>
    <p>Please log in to the system to renew this document.</p>
    <p><a href="${config.frontendUrl}/clients" style="padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px;">View Clients</a></p>
    <hr>
    <p style="color: #666; font-size: 12px;">This is an automated reminder from AML Guardian Pro</p>
  `;

  await sendEmail({ to, subject, html });
}

/**
 * CDD Review reminder email
 */
export async function sendCDDReviewReminder(
  to: string,
  userName: string,
  clientName: string,
  reviewDate: string
): Promise<void> {
  const subject = 'CDD Review Due - Client Review Required';
  const html = `
    <h2>AML Guardian Pro - CDD Review Due</h2>
    <p>Hello ${userName},</p>
    <p>A customer due diligence review is due for the following client:</p>
    <ul>
      <li><strong>Client:</strong> ${clientName}</li>
      <li><strong>Review Date:</strong> ${reviewDate}</li>
    </ul>
    <p>Please complete the review and update the client's risk assessment as necessary.</p>
    <p><a href="${config.frontendUrl}/clients" style="padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px;">View Clients</a></p>
    <hr>
    <p style="color: #666; font-size: 12px;">This is an automated reminder from AML Guardian Pro</p>
  `;

  await sendEmail({ to, subject, html });
}

/**
 * New client added notification
 */
export async function sendNewClientNotification(
  to: string,
  userName: string,
  clientName: string,
  riskLevel: string
): Promise<void> {
  const subject = 'New Client Added - Risk Assessment Complete';
  const html = `
    <h2>AML Guardian Pro - New Client Added</h2>
    <p>Hello ${userName},</p>
    <p>A new client has been added to the system:</p>
    <ul>
      <li><strong>Client:</strong> ${clientName}</li>
      <li><strong>Risk Level:</strong> ${riskLevel}</li>
    </ul>
    <p>The AI has generated a risk assessment for this client. Please review and verify the required documents.</p>
    <p><a href="${config.frontendUrl}/clients" style="padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px;">View Client</a></p>
    <hr>
    <p style="color: #666; font-size: 12px;">This is an automated notification from AML Guardian Pro</p>
  `;

  await sendEmail({ to, subject, html });
}

/**
 * Risk assessment overridden notification
 */
export async function sendRiskOverrideNotification(
  to: string,
  userName: string,
  clientName: string,
  oldRisk: string,
  newRisk: string,
  reason: string
): Promise<void> {
  const subject = 'Risk Assessment Manually Overridden';
  const html = `
    <h2>AML Guardian Pro - Risk Assessment Overridden</h2>
    <p>Hello ${userName},</p>
    <p>A risk assessment has been manually overridden:</p>
    <ul>
      <li><strong>Client:</strong> ${clientName}</li>
      <li><strong>Original Risk:</strong> ${oldRisk}</li>
      <li><strong>New Risk:</strong> ${newRisk}</li>
      <li><strong>Reason:</strong> ${reason}</li>
    </ul>
    <p>Please review this change for compliance purposes.</p>
    <p><a href="${config.frontendUrl}/clients" style="padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px;">View Client</a></p>
    <hr>
    <p style="color: #666; font-size: 12px;">This is an automated notification from AML Guardian Pro</p>
  `;

  await sendEmail({ to, subject, html });
}
