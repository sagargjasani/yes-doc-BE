import { REFERENCE_FORM_LINK_DAYS } from '../../constants/linkExpiry';
import { duration } from '../components/duration';
import { Highlight, Paragraph, PrimaryButton } from '../components/Content';
import { Layout } from '../components/Layout';

export interface ReferenceResubmissionProps {
  refereeName: string;
  candidateName: string;
  reason: string;
  referenceUrl: string;
}

export const subject = ({ candidateName }: ReferenceResubmissionProps) =>
  `Updates needed on your reference for ${candidateName}`;

const ReferenceResubmission = ({ refereeName, candidateName, reason, referenceUrl }: ReferenceResubmissionProps) => (
  <Layout
    preview={`We need a small update to your reference for ${candidateName}.`}
    heading="A small update to your reference"
    whyReceived={`You're receiving this email because you're giving a reference for ${candidateName} to Yesdoc Healthcare.`}
  >
    <Paragraph>Dear {refereeName},</Paragraph>
    <Paragraph>
      Thank you for your reference for <strong>{candidateName}</strong>. Before we can accept it, we need you to update
      the following:
    </Paragraph>
    <Highlight title="What to update">{reason}</Highlight>
    <PrimaryButton href={referenceUrl}>Update reference</PrimaryButton>
    <Paragraph>This link is valid for {duration(REFERENCE_FORM_LINK_DAYS, 'day')}.</Paragraph>
  </Layout>
);

ReferenceResubmission.PreviewProps = {
  refereeName: 'Dr Grace Mensah',
  candidateName: 'Amara Okafor',
  reason: 'Please add the dates Amara worked with you.',
  referenceUrl: 'http://localhost:5173/reference-form/3f9c2e7a1b',
} satisfies ReferenceResubmissionProps;

export default ReferenceResubmission;
