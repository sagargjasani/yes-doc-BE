import { ACCOUNT_SETUP_LINK_HOURS } from '../../constants/linkExpiry';
import { duration } from '../components/duration';
import { Paragraph, PrimaryButton } from '../components/Content';
import { Layout } from '../components/Layout';

export interface CandidateInviteProps {
  firstName: string;
  setPasswordUrl: string;
}

export const subject = () => 'Welcome to Yesdoc Healthcare: set up your account';

const CandidateInvite = ({ firstName, setPasswordUrl }: CandidateInviteProps) => (
  <Layout
    preview="Set your password to start your application with Yesdoc Healthcare."
    heading="Welcome to Yesdoc Healthcare"
    whyReceived="You're receiving this email because a Yesdoc Healthcare consultant created a candidate account for you."
  >
    <Paragraph>Hi {firstName},</Paragraph>
    <Paragraph>
      We've created your candidate account. Set a password to sign in, then you can fill in your application form and
      upload your documents.
    </Paragraph>
    <PrimaryButton href={setPasswordUrl}>Set your password</PrimaryButton>
    <Paragraph>This link is valid for {duration(ACCOUNT_SETUP_LINK_HOURS, 'hour')}.</Paragraph>
  </Layout>
);

CandidateInvite.PreviewProps = {
  firstName: 'Amara',
  setPasswordUrl: 'http://localhost:5173/create-password/3f9c2e7a1b',
} satisfies CandidateInviteProps;

export default CandidateInvite;
