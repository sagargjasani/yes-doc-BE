// Checks the SMTP settings in .env by signing in, and optionally sends a test email:
//   pnpm email:verify                 (sign in only)
//   pnpm email:verify you@example.com (sign in and send)
import { env } from '../config/env';
import { getTransport } from './transport';

const main = async () => {
  if (!env.SMTP_HOST) throw new Error('SMTP_HOST is empty, so mail would go to Ethereal. Set the SMTP_* values first.');

  const transport = await getTransport();
  await transport.verify();
  console.log(`Signed in to ${env.SMTP_HOST} as ${env.SMTP_USER}`);

  const to = process.argv[2];
  if (to) {
    const info = await transport.sendMail({
      from: env.EMAIL_FROM,
      replyTo: env.EMAIL_REPLY_TO,
      to,
      subject: 'Yesdoc Healthcare test email',
      text: 'If you can read this, outbound email is working.',
    });
    console.log(`Sent test email to ${to}: ${info.messageId}`);
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
