import { Paragraph } from '../components/Content';
import { Layout, ONBOARDING_NOTE } from '../components/Layout';

export interface DocumentsApprovedProps {
  firstName: string;
}

export const subject = () => 'Your documents have been approved';

const DocumentsApproved = ({ firstName }: DocumentsApprovedProps) => (
  <Layout
    preview="Good news: every document you submitted has been approved."
    heading="Your documents are approved"
    whyReceived={ONBOARDING_NOTE}
  >
    <Paragraph>Hi {firstName},</Paragraph>
    <Paragraph>
      Good news: we've reviewed every document you submitted and they're all approved. There's nothing more you need to
      do for this step.
    </Paragraph>
    <Paragraph>We'll be in touch about what happens next.</Paragraph>
  </Layout>
);

DocumentsApproved.PreviewProps = { firstName: 'Amara' } satisfies DocumentsApprovedProps;

export default DocumentsApproved;
