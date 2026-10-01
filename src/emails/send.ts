import { env } from '../config/env';
import logger from '../utils/logger';
import type { EmailProps, EmailTemplateName } from './registry';
import { renderEmail } from './render';
import { getTransport, previewUrl } from './transport';

// The email IS the action here, so the caller must hear about a failure.
const mustDeliver: ReadonlySet<EmailTemplateName> = new Set(['passwordReset']);

/**
 * Renders and sends one email. Delivery is best-effort (ADR 0001): a failure is logged and
 * swallowed, because the action that triggered the email has already been saved.
 * Password reset is the exception and rethrows.
 */
export const sendEmail = async <T extends EmailTemplateName>(
  template: T,
  { to, props }: { to: string; props: EmailProps<T> }
): Promise<void> => {
  try {
    const { subject, html, text } = await renderEmail(template, props);
    const transport = await getTransport();
    const info = await transport.sendMail({ from: env.EMAIL_FROM, replyTo: env.EMAIL_REPLY_TO, to, subject, html, text });

    logger.info(`Email "${template}" sent: ${info.messageId}`);
    const preview = previewUrl(info);
    if (preview) logger.info(`Email "${template}" preview: ${preview}`);
  } catch (error) {
    logger.error(`Email "${template}" could not be sent`, { to, error });
    if (mustDeliver.has(template)) throw error;
  }
};
