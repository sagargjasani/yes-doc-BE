import { Paragraph, PrimaryButton } from '../components/Content';
import { Layout, ONBOARDING_NOTE } from '../components/Layout';

export interface ApplicationApprovedProps {
  firstName: string;
  uploadUrl: string;
}

export const subject = () => 'Your application is approved: next, upload your documents';

const ApplicationApproved = ({ firstName, uploadUrl }: ApplicationApprovedProps) => (
  <Layout
    preview="Your application form is approved. Next, upload your documents."
    heading="Your application is approved"
    whyReceived={ONBOARDING_NOTE}
  >
    <Paragraph>Hi {firstName},</Paragraph>
    <Paragraph>
      Great news: we've approved your application form. The next step is to upload your documents, such as your
      passport, proof of address and DBS certificate.
    </Paragraph>
    <PrimaryButton href={uploadUrl}>Upload documents</PrimaryButton>
  </Layout>
);

ApplicationApproved.PreviewProps = {
  firstName: 'Amara',
  uploadUrl: 'http://localhost:5173/candidate/document-form',
} satisfies ApplicationApprovedProps;

export default ApplicationApproved;
