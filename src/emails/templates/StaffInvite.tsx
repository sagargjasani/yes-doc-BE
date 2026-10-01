import { ACCOUNT_SETUP_LINK_HOURS } from '../../constants/linkExpiry';
import type { Role } from '../../models/User.model';
import { duration } from '../components/duration';
import { Paragraph, PrimaryButton } from '../components/Content';
import { Layout } from '../components/Layout';

export interface StaffInviteProps {
  firstName: string;
  role: Exclude<Role, Role.CANDIDATE>;
  setPasswordUrl: string;
}

const roleTitle = (role: string) => role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();

export const subject = ({ role }: StaffInviteProps) => `Your Yesdoc Healthcare ${roleTitle(role)} account is ready`;

const StaffInvite = ({ firstName, role, setPasswordUrl }: StaffInviteProps) => (
  <Layout
    preview={`Set your password to start using your ${roleTitle(role)} account.`}
    heading="Your account is ready"
    whyReceived="You're receiving this email because an administrator created a Yesdoc Healthcare staff account for you."
  >
    <Paragraph>Hi {firstName},</Paragraph>
    <Paragraph>
      An administrator has created a <strong>{roleTitle(role)}</strong> account for you on the Yesdoc Healthcare
      onboarding system. Set a password to sign in.
    </Paragraph>
    <PrimaryButton href={setPasswordUrl}>Set your password</PrimaryButton>
    <Paragraph>This link is valid for {duration(ACCOUNT_SETUP_LINK_HOURS, 'hour')}.</Paragraph>
  </Layout>
);

StaffInvite.PreviewProps = {
  firstName: 'Priya',
  role: 'compliance' as StaffInviteProps['role'],
  setPasswordUrl: 'http://localhost:5173/create-password/3f9c2e7a1b',
} satisfies StaffInviteProps;

export default StaffInvite;
