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

export const sendCreatePasswordEmail = async (email: string, resetToken: string) => {
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

    const info = await transporter.sendMail({
      from: '"Hey Doc Admin" <admin@heydoc.com>',
      to: email,
      subject: 'Welcome to Hey Doc! Please set your password',
      text: `Welcome to Hey Doc!\n\n
        Your candidate profile has been created successfully. Please click on the following link, or paste this into your browser to set up your password and access your account:\n\n
        ${resetUrl}\n\n
        This link is valid for 24 hours.\n`,
      html: `
        <p>Welcome to Hey Doc!</p>
        <p>Your candidate profile has been created successfully. Please click on the following link, or paste this into your browser to set up your password and access your account:</p>
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
