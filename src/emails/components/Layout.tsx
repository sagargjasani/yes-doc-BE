import type { ReactNode } from 'react';
import { Body, Column, Container, Head, Heading, Html, Img, Link, Preview, Row, Section, Text } from 'react-email';
import { useAssetUrl } from './assets';
import { colors, company, fontFamily, paragraph } from './theme';

interface LayoutProps {
  /** Inbox preview line shown after the subject. */
  preview: string;
  heading: string;
  /** Footer line telling the reader why they got this email. */
  whyReceived: string;
  children: ReactNode;
}

export const Layout = ({ preview, heading, whyReceived, children }: LayoutProps) => (
  <Html lang="en">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={{ backgroundColor: colors.page, margin: 0, padding: '24px 0', fontFamily }}>
      <Container style={{ maxWidth: '600px', width: '100%', backgroundColor: colors.card, borderRadius: '8px', overflow: 'hidden' }}>
        <Img
          src={useAssetUrl('header.png')}
          alt="Yesdoc Healthcare"
          width="600"
          style={{ display: 'block', width: '100%', height: 'auto' }}
        />
        <Section style={{ padding: '8px 40px 16px' }}>
          <Heading as="h1" style={{ color: colors.slate, fontSize: '24px', lineHeight: '32px', margin: '0 0 16px' }}>
            {heading}
          </Heading>
          {children}
          <Text style={{ ...paragraph, margin: '32px 0 0' }}>
            Kind regards,
            <br />
            <strong>{company.signOff}</strong>
          </Text>
        </Section>
        <Footer whyReceived={whyReceived} />
      </Container>
    </Body>
  </Html>
);

const Footer = ({ whyReceived }: { whyReceived: string }) => (
  <Section style={{ borderTop: `1px solid ${colors.border}` }}>
    <Row>
      <Column style={{ width: '50%', verticalAlign: 'bottom' }}>
        <Img
          src={useAssetUrl('footer.png')}
          alt=""
          width="280"
          style={{ display: 'block', width: '100%', maxWidth: '280px', height: 'auto' }}
        />
      </Column>
      <Column style={{ width: '50%', verticalAlign: 'middle', padding: '16px 24px 16px 8px' }}>
        <Text style={footerText}>
          <strong style={{ color: colors.slate }}>{company.name}</strong>
          <br />
          Registration No.: {company.registrationNumber}
          <br />
          Tel: <Link href={`tel:${company.phone}`} style={footerLink}>{company.phone}</Link>
          <br />
          <Link href={`https://${company.website}`} style={footerLink}>{company.website}</Link>
          <br />
          {company.addressLines.map((line) => (
            <span key={line}>
              {line}
              <br />
            </span>
          ))}
        </Text>
      </Column>
    </Row>
    <Text style={{ ...footerText, textAlign: 'center', padding: '16px 24px 24px', margin: 0 }}>{whyReceived}</Text>
  </Section>
);

/** Footer note for emails a Candidate gets as part of onboarding. */
export const ONBOARDING_NOTE = "You're receiving this email because you're onboarding with Yesdoc Healthcare.";

const footerText = { color: colors.muted, fontSize: '13px', lineHeight: '20px', margin: 0 };
const footerLink = { color: colors.slate, textDecoration: 'underline' };
