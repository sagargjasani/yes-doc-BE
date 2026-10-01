// The global setup mocks sendEmail for every other suite; this one tests the real thing
// against a fake transport.
jest.unmock('../src/emails/send');
jest.mock('../src/emails/transport');

import { sendEmail } from '../src/emails/send';
import { getTransport } from '../src/emails/transport';
import logger from '../src/utils/logger';

const sendMail = jest.fn();

beforeEach(() => {
  jest.mocked(getTransport).mockResolvedValue({ sendMail } as never);
});

describe('sendEmail', () => {
  it('sends the rendered email from Yesdoc Healthcare with a reply-to address', async () => {
    sendMail.mockResolvedValue({ messageId: 'm1' });

    await sendEmail('documentsApproved', { to: 'amara@example.com', props: { firstName: 'Amara' } });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'amara@example.com',
        from: expect.stringContaining('Yesdoc Healthcare'),
        replyTo: expect.stringContaining('@yesdochealthcare.co.uk'),
        subject: 'Your documents have been approved',
        html: expect.stringContaining('Amara'),
        text: expect.stringContaining('Amara'),
      })
    );
  });

  it('logs a failed send and does not throw, so the saved action still succeeds', async () => {
    sendMail.mockRejectedValue(new Error('SMTP down'));
    const logError = jest.spyOn(logger, 'error').mockImplementation(() => logger);

    await expect(
      sendEmail('documentsApproved', { to: 'amara@example.com', props: { firstName: 'Amara' } })
    ).resolves.toBeUndefined();

    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining('documentsApproved'),
      expect.objectContaining({ to: 'amara@example.com', error: expect.any(Error) })
    );
  });

  it('throws when a password reset email fails, because the email is the whole action', async () => {
    sendMail.mockRejectedValue(new Error('SMTP down'));
    jest.spyOn(logger, 'error').mockImplementation(() => logger);

    await expect(
      sendEmail('passwordReset', {
        to: 'amara@example.com',
        props: { firstName: 'Amara', resetUrl: 'https://app.test/reset-password/abc' },
      })
    ).rejects.toThrow();
  });
});
