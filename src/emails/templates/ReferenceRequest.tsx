import { REFERENCE_FORM_LINK_DAYS } from '../../constants/linkExpiry';
import { duration } from '../components/duration';
import { Paragraph, PrimaryButton } from '../components/Content';
import { Layout } from '../components/Layout';

export interface ReferenceRequestProps {
  refereeName: string;
  candidateName: string;
  referenceUrl: string;
}

export const subject = ({ candidateName }: ReferenceRequestProps) => `Reference request for ${candidateName}`;

const ReferenceRequest = ({ refereeName, candidateName, referenceUrl }: ReferenceRequestProps) => (
  <Layout
    preview={`${candidateName} has named you as a referee. The form takes a few minutes.`}
    heading="Can you give a reference?"
    whyReceived={`You're receiving this email because ${candidateName} named you as a referee in their application to Yesdoc Healthcare.`}
  >
    <Paragraph>Dear {refereeName},</Paragraph>
    <Paragraph>
      <strong>{candidateName}</strong> has applied to work with Yesdoc Healthcare, a healthcare recruitment agency, and
      has named you as a professional referee. We'd be grateful if you could complete a short reference form.
    </Paragraph>
    <PrimaryButton href={referenceUrl}>Complete reference</PrimaryButton>
    <Paragraph>This link is valid for {duration(REFERENCE_FORM_LINK_DAYS, 'day')}. Thank you for your help.</Paragraph>
  </Layout>
);

ReferenceRequest.PreviewProps = {
  refereeName: 'Dr Grace Mensah',
  candidateName: 'Amara Okafor',
  referenceUrl: 'http://localhost:5173/reference-form/3f9c2e7a1b',
} satisfies ReferenceRequestProps;

export default ReferenceRequest;
