import nodemailer from 'nodemailer';
import logger from './logger';

export const sendPasswordResetEmail = async (email: string, resetToken: string) => {
  try {
    // For local development, we use ethereal fake SMTP service
    const testAccount = await nodemailer.createTestAccount();

    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user, // generated ethereal user
        pass: testAccount.pass, // generated ethereal password
      },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    const info = await transporter.sendMail({
      from: '"Hey Doc Admin" <admin@heydoc.com>',
      to: email,
      subject: 'Password Reset Request',
      text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
        Please click on the following link, or paste this into your browser to complete the process:\n\n
        ${resetUrl}\n\n
        If you did not request this, please ignore this email and your password will remain unchanged.\n`,
      html: `
        <p>You are receiving this because you (or someone else) have requested the reset of the password for your account.</p>
        <p>Please click on the following link, or paste this into your browser to complete the process:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
      `,
    });

    logger.info(`Message sent: ${info.messageId}`);
    // Preview only available when sending through an Ethereal account
    logger.info(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
  } catch (error) {
    logger.error('Error sending password reset email', error);
    throw new Error('Could not send reset email');
  }
};

export const sendCreatePasswordEmail = async (email: string, resetToken: string, role?: string) => {
  try {
    // For local development, we use ethereal fake SMTP service
    const testAccount = await nodemailer.createTestAccount();

    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user, // generated ethereal user
        pass: testAccount.pass, // generated ethereal password
      },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/create-password/${resetToken}`;

    const isStaff = role && role.toLowerCase() !== 'candidate';
    const roleTitle = role ? role.charAt(0).toUpperCase() + role.slice(1) : '';
    const subject = isStaff
      ? `Welcome to Hey Doc! Please set your password (${roleTitle} Account)`
      : 'Welcome to Hey Doc! Please set your password';
    const entityText = isStaff ? `Your ${roleTitle} account` : 'Your candidate profile';

    const info = await transporter.sendMail({
      from: '"Hey Doc Admin" <admin@heydoc.com>',
      to: email,
      subject,
      text: `Welcome to Hey Doc!\n\n
        ${entityText} has been created successfully. Please click on the following link, or paste this into your browser to set up your password and access your account:\n\n
        ${resetUrl}\n\n
        This link is valid for 24 hours.\n`,
      html: `
        <p>Welcome to Hey Doc!</p>
        <p>${entityText} has been created successfully. Please click on the following link, or paste this into your browser to set up your password and access your account:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link is valid for 24 hours.</p>
      `,
    });

    logger.info(`Message sent: ${info.messageId}`);
    // Preview only available when sending through an Ethereal account
    logger.info(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
  } catch (error) {
    logger.error('Error sending create password email', error);
    throw new Error('Could not send create password email');
  }
};

export const sendApplicationApprovedEmail = async (email: string) => {
  try {
    const testAccount = await nodemailer.createTestAccount();

    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const uploadUrl = `${frontendUrl}/document-upload`;

    const info = await transporter.sendMail({
      from: '"Hey Doc Admin" <admin@heydoc.com>',
      to: email,
      subject: 'Application Form Approved - Proceed to Document Upload',
      text: `Congratulations!\n\n
        Your application form has been approved. Please proceed to upload your documents by clicking the link below:\n\n
        ${uploadUrl}\n\n`,
      html: `
        <p>Congratulations!</p>
        <p>Your application form has been approved. Please proceed to upload your documents by clicking the link below:</p>
        <p><a href="${uploadUrl}">${uploadUrl}</a></p>
      `,
    });

    logger.info(`Message sent: ${info.messageId}`);
    logger.info(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
  } catch (error) {
    logger.error('Error sending application approved email', error);
    throw new Error('Could not send application approved email');
  }
};

export const sendApplicationChangesRequiredEmail = async (email: string, reason: string) => {
  try {
    const testAccount = await nodemailer.createTestAccount();

    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const applicationUrl = `${frontendUrl}/application-form`;

    const info = await transporter.sendMail({
      from: '"Hey Doc Admin" <admin@heydoc.com>',
      to: email,
      subject: 'Changes Required for Your Application Form',
      text: `Hello,\n\n
        We have reviewed your application form, and some changes are required before we can proceed.\n\n
        Reason: ${reason}\n\n
        Please review and update your application form by clicking the link below:\n\n
        ${applicationUrl}\n\n`,
      html: `
        <p>Hello,</p>
        <p>We have reviewed your application form, and some changes are required before we can proceed.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>Please review and update your application form by clicking the link below:</p>
        <p><a href="${applicationUrl}">${applicationUrl}</a></p>
      `,
    });

    logger.info(`Message sent: ${info.messageId}`);
    logger.info(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
  } catch (error) {
    logger.error('Error sending application changes required email', error);
    throw new Error('Could not send application changes required email');
  }
};

export const sendReferenceRequestEmail = async (
  email: string,
  refereeName: string,
  candidateName: string,
  token: string,
  isResubmission = false,
  rejectionReason?: string
) => {
  try {
    const testAccount = await nodemailer.createTestAccount();

    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const referenceUrl = `${frontendUrl}/reference-form/${token}`;

    const subject = isResubmission
      ? `Reference Form Update Required for ${candidateName}`
      : `Reference Request for ${candidateName}`;

    const resubmissionText = isResubmission && rejectionReason
      ? `\n\nYour previous reference submission required updates for the following reason:\n"${rejectionReason}"\n\nPlease review and update your responses.`
      : '';

    const resubmissionHtml = isResubmission && rejectionReason
      ? `<p style="color: #c53030; background: #fff5f5; padding: 12px; border-radius: 6px;"><strong>Updates Required:</strong> ${rejectionReason}</p>`
      : '';

    const textContent = `Hello ${refereeName},\n\nYou have been requested to provide a professional reference for ${candidateName}.${resubmissionText}\n\nPlease click on the link below to complete the reference form:\n${referenceUrl}\n\nNote: This link will be active for 7 days.\n\nThank you!`;

    const htmlContent = `
      <p>Hello <strong>${refereeName}</strong>,</p>
      <p>You have been listed as a professional reference for <strong>${candidateName}</strong>.</p>
      ${resubmissionHtml}
      <p>Please click on the link below to fill out the quick reference form for this candidate:</p>
      <p><a href="${referenceUrl}" style="background-color: #2b6cb0; color: white; padding: 10px 18px; text-decoration: none; border-radius: 4px; display: inline-block;">Complete Reference Form</a></p>
      <p>Or paste this link into your browser: <br /><a href="${referenceUrl}">${referenceUrl}</a></p>
      <p><em>Note: This link is active for 7 days.</em></p>
      <p>Thank you!</p>
    `;

    const info = await transporter.sendMail({
      from: '"Hey Doc Compliance" <compliance@heydoc.com>',
      to: email,
      subject,
      text: textContent,
      html: htmlContent,
    });

    logger.info(`Reference email sent: ${info.messageId}`);
    logger.info(`Reference email Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
  } catch (error) {
    logger.error('Error sending reference request email', error);
    throw new Error('Could not send reference request email');
  }
};


const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export interface RejectedDocumentNotice {
  label: string;
  rejectionReason: string;
}

export const sendDocumentsApprovedEmail = async (email: string) => {
  try {
    const testAccount = await nodemailer.createTestAccount();

    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    const info = await transporter.sendMail({
      from: '"Hey Doc Admin" <admin@heydoc.com>',
      to: email,
      subject: 'Your Documents Have Been Approved',
      text: `Hello,\n\n
        Good news: all of your documents have been reviewed and approved. No further action is needed for this step.\n\n`,
      html: `
        <p>Hello,</p>
        <p>Good news: all of your documents have been reviewed and approved. No further action is needed for this step.</p>
      `,
    });

    logger.info(`Message sent: ${info.messageId}`);
    logger.info(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
  } catch (error) {
    logger.error('Error sending documents approved email', error);
    throw new Error('Could not send documents approved email');
  }
};

export const sendDocumentChangesRequiredEmail = async (email: string, rejected: RejectedDocumentNotice[]) => {
  try {
    const testAccount = await nodemailer.createTestAccount();

    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const uploadUrl = `${frontendUrl}/candidate/document-form`;
    const textList = rejected.map(({ label, rejectionReason }) => `- ${label}: ${rejectionReason}`).join('\n');
    const htmlList = rejected
      .map(({ label, rejectionReason }) => `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(rejectionReason)}</li>`)
      .join('');

    const info = await transporter.sendMail({
      from: '"Hey Doc Admin" <admin@heydoc.com>',
      to: email,
      subject: 'Changes Required for Your Documents',
      text: `Hello,\n\n
        We have reviewed your documents. The following need to be uploaded again:\n\n
        ${textList}\n\n
        Please upload replacements and resubmit using the link below:\n\n
        ${uploadUrl}\n\n`,
      html: `
        <p>Hello,</p>
        <p>We have reviewed your documents. The following need to be uploaded again:</p>
        <ul>${htmlList}</ul>
        <p>Please upload replacements and resubmit using the link below:</p>
        <p><a href="${uploadUrl}">${uploadUrl}</a></p>
      `,
    });

    logger.info(`Message sent: ${info.messageId}`);
    logger.info(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
  } catch (error) {
    logger.error('Error sending document changes required email', error);
    throw new Error('Could not send document changes required email');
  }
};
