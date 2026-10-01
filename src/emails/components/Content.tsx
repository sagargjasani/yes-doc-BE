import type { ReactNode } from 'react';
import { Button, Link, Section, Text } from 'react-email';
import { colors, paragraph } from './theme';

export const Paragraph = ({ children }: { children: ReactNode }) => <Text style={paragraph}>{children}</Text>;

/** The one main action of an email, with the raw link underneath for clients that break buttons. */
export const PrimaryButton = ({ href, children }: { href: string; children: ReactNode }) => (
  <Section style={{ margin: '24px 0' }}>
    <Button
      href={href}
      style={{
        backgroundColor: colors.coral,
        color: colors.card,
        fontSize: '16px',
        fontWeight: 600,
        padding: '14px 28px',
        borderRadius: '6px',
        textDecoration: 'none',
        display: 'inline-block',
      }}
    >
      {children}
    </Button>
    <Text style={{ color: colors.muted, fontSize: '13px', lineHeight: '20px', margin: '16px 0 0', wordBreak: 'break-all' }}>
      Or paste this link into your browser:
      <br />
      <Link href={href} style={{ color: colors.slate }}>
        {href}
      </Link>
    </Text>
  </Section>
);

/** Something the reader must notice, such as a Rejection Reason. */
export const Highlight = ({ title, children }: { title?: string; children: ReactNode }) => (
  <Section
    style={{
      backgroundColor: colors.coralLight,
      borderLeft: `4px solid ${colors.coral}`,
      borderRadius: '4px',
      padding: '12px 16px',
      margin: '0 0 12px',
    }}
  >
    {title && <Text style={{ color: colors.slate, fontSize: '15px', fontWeight: 700, margin: '0 0 4px' }}>{title}</Text>}
    <Text style={{ color: colors.text, fontSize: '15px', lineHeight: '22px', margin: 0 }}>{children}</Text>
  </Section>
);
