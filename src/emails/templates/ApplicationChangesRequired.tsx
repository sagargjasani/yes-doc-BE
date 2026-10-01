import { Highlight, Paragraph, PrimaryButton } from '../components/Content';
import { Layout, ONBOARDING_NOTE } from '../components/Layout';

export interface ApplicationChangesRequiredProps {
  firstName: string;
  reason: string;
  applicationUrl: string;
}

export const subject = () => 'Changes needed on your application';

const ApplicationChangesRequired = ({ firstName, reason, applicationUrl }: ApplicationChangesRequiredProps) => (
  <Layout
    preview="We've reviewed your application form and need a few changes."
    heading="Changes needed on your application"
    whyReceived={ONBOARDING_NOTE}
  >
    <Paragraph>Hi {firstName},</Paragraph>
    <Paragraph>Thanks for sending your application form. We've reviewed it and need you to make some changes:</Paragraph>
    <Highlight title="What to change">{reason}</Highlight>
    <Paragraph>Once you've updated the form, submit it again and we'll take another look.</Paragraph>
    <PrimaryButton href={applicationUrl}>Update application</PrimaryButton>
  </Layout>
);

ApplicationChangesRequired.PreviewProps = {
  firstName: 'Amara',
  reason: 'Please explain the gap in your employment history between March and September 2023.',
  applicationUrl: 'http://localhost:5173/candidate/application-form',
} satisfies ApplicationChangesRequiredProps;

export default ApplicationChangesRequired;
