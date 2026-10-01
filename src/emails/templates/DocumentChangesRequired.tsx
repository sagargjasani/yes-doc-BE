import { Highlight, Paragraph, PrimaryButton } from '../components/Content';
import { Layout, ONBOARDING_NOTE } from '../components/Layout';

export interface RejectedDocumentNotice {
  /** The Required Document's label, as the Candidate sees it. */
  label: string;
  rejectionReason: string;
}

export interface DocumentChangesRequiredProps {
  firstName: string;
  rejected: RejectedDocumentNotice[];
  uploadUrl: string;
}

export const subject = () => 'Some of your documents need re-uploading';

const DocumentChangesRequired = ({ firstName, rejected, uploadUrl }: DocumentChangesRequiredProps) => (
  <Layout
    preview={`${rejected.length} of your documents need a new upload before we can continue.`}
    heading="Some documents need re-uploading"
    whyReceived={ONBOARDING_NOTE}
  >
    <Paragraph>Hi {firstName},</Paragraph>
    <Paragraph>
      Thanks for submitting your documents. We've reviewed them, and the following need a new upload before we can
      continue:
    </Paragraph>
    {rejected.map(({ label, rejectionReason }) => (
      <Highlight key={label} title={label}>
        {rejectionReason}
      </Highlight>
    ))}
    <Paragraph>Everything else is approved, so you only need to replace the documents listed above.</Paragraph>
    <PrimaryButton href={uploadUrl}>Upload replacements</PrimaryButton>
  </Layout>
);

DocumentChangesRequired.PreviewProps = {
  firstName: 'Amara',
  rejected: [
    { label: 'Passport', rejectionReason: 'The photo page is cut off. Please upload a clear scan of the whole page.' },
    { label: 'Proof of Address 2', rejectionReason: 'This letter is older than three months.' },
  ],
  uploadUrl: 'http://localhost:5173/candidate/document-form',
} satisfies DocumentChangesRequiredProps;

export default DocumentChangesRequired;
