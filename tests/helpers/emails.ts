import type { EmailTemplateName } from '../../src/emails/registry';
import { sendEmail } from '../../src/emails/send';

/** Emails handed to the (mocked) sendEmail so far, optionally only one template's. */
export const emailsSent = (template?: EmailTemplateName) =>
  jest
    .mocked(sendEmail)
    .mock.calls.filter(([name]) => !template || name === template)
    .map(([name, { to, props }]) => ({ template: name, to, props }));
