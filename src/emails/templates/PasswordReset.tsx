import { PASSWORD_RESET_LINK_HOURS } from '../../constants/linkExpiry';
import { duration } from '../components/duration';
import { Paragraph, PrimaryButton } from '../components/Content';
import { Layout } from '../components/Layout';

export interface PasswordResetProps {
  firstName: string;
  resetUrl: string;
}

export const subject = () => 'Reset your Yesdoc Healthcare password';

const hours = duration(PASSWORD_RESET_LINK_HOURS, 'hour');

const PasswordReset = ({ firstName, resetUrl }: PasswordResetProps) => (
  <Layout
    preview={`Use this link within ${hours} to choose a new password.`}
    heading="Reset your password"
    whyReceived="You're receiving this email because someone asked to reset the password for this email address."
  >
    <Paragraph>Hi {firstName},</Paragraph>
    <Paragraph>We received a request to reset your password. Choose a new one using the button below.</Paragraph>
    <PrimaryButton href={resetUrl}>Reset password</PrimaryButton>
    <Paragraph>This link is valid for {hours}.</Paragraph>
    <Paragraph>If you didn't ask to reset your password, you can ignore this email. Your password won't change.</Paragraph>
  </Layout>
);

PasswordReset.PreviewProps = {
  firstName: 'Amara',
  resetUrl: 'http://localhost:5173/reset-password/3f9c2e7a1b',
} satisfies PasswordResetProps;

export default PasswordReset;
