import { emailTemplates, type EmailTemplateName } from '../src/emails/registry';
import { renderEmail } from '../src/emails/render';

const ASSET_BASE = process.env.EMAIL_ASSET_BASE_URL!;

const templateNames = Object.keys(emailTemplates) as EmailTemplateName[];

/** Sample props are what the preview server shows; every template must declare them. */
const sampleProps = (name: EmailTemplateName) => {
  const props = emailTemplates[name].component.PreviewProps;
  if (!props) throw new Error(`${name} has no PreviewProps`);
  return props as Record<string, unknown>;
};

const urlProps = (props: Record<string, unknown>) =>
  Object.entries(props)
    .filter(([key]) => key.endsWith('Url'))
    .map(([, value]) => value as string);

const imageSources = (html: string) => [...html.matchAll(/<img[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]);

describe.each(templateNames)('%s email', (name) => {
  const props = sampleProps(name);
  let rendered: Awaited<ReturnType<typeof renderEmail>>;

  beforeAll(async () => {
    rendered = await renderEmail(name, props as never);
  });

  it('has a subject that names Yesdoc Healthcare or the Candidate, never Hey Doc', () => {
    expect(rendered.subject.trim()).not.toBe('');
    expect(`${rendered.subject} ${rendered.html} ${rendered.text}`).not.toMatch(/hey\s*doc/i);
  });

  // Referees file emails by Candidate, so reference subjects must name them
  if ('candidateName' in props) {
    it('names the Candidate in the subject', () => {
      expect(rendered.subject).toContain(props.candidateName as string);
    });
  }

  it('puts every link in both the HTML and the plain text', () => {
    for (const url of urlProps(props)) {
      expect(rendered.html).toContain(url);
      expect(rendered.text).toContain(url);
    }
  });

  it('greets the reader by name', () => {
    const name = (props.firstName ?? props.refereeName) as string;
    expect(rendered.html).toContain(name);
    expect(rendered.text).toContain(name);
  });

  it('loads the letterhead artwork from the email asset host', () => {
    const sources = imageSources(rendered.html);
    expect(sources.length).toBeGreaterThanOrEqual(2);
    for (const src of sources) expect(src.startsWith(ASSET_BASE)).toBe(true);
  });

  it('shows the Yesdoc Healthcare contact details as text', () => {
    for (const detail of ['15035215', '02081294836', 'yesdochealthcare.co.uk', '71-75 Shelton Street', 'WC2H 9JQ']) {
      expect(rendered.text).toContain(detail);
    }
  });

  it('is signed off by the Yesdoc Healthcare Compliance Team', () => {
    expect(rendered.text).toContain('The Yesdoc Healthcare Compliance Team');
  });
});

describe('user-supplied text', () => {
  const script = '<script>alert(1)</script>';

  const expectInert = (html: string) => {
    expect(html).not.toContain(script);
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  };

  it('escapes a Rejection Reason', async () => {
    const { html } = await renderEmail('documentChangesRequired', {
      firstName: 'Amara',
      rejected: [{ label: 'Passport', rejectionReason: script }],
      uploadUrl: 'https://app.test/candidate/document-form',
    });
    expectInert(html);
  });

  it('escapes Referee and Candidate names, including in the reason box', async () => {
    const { html } = await renderEmail('referenceResubmission', {
      refereeName: script,
      candidateName: script,
      reason: script,
      referenceUrl: 'https://app.test/reference-form/abc',
    });
    expectInert(html);
  });
});
