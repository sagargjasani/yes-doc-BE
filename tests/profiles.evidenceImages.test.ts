import path from 'node:path';
import fse from 'fs-extra';
import PizZip from 'pizzip';
import { Role } from '../src/models/User.model';
import { downloadS3File, uploadS3File } from '../src/services/s3.service';
import { loginAs } from './helpers/auth';
import { candidateWithVisaType, reviewDocuments, upload, uploadAllRequired } from './helpers/documents';

const fixture = (name: string) => fse.readFileSync(path.join(__dirname, 'fixtures', name));

/** Every Candidate Document downloads as `file`, unless its s3Key names a file label in `byDocument`. */
const serveFromS3 = (file: string, byDocument: Record<string, string> = {}) => {
  jest.mocked(downloadS3File).mockImplementation(async (key: string) => {
    const match = Object.keys(byDocument).find((label) => key.includes(`/${label}.`));
    return fixture(match ? byDocument[match] : file);
  });
};

/**
 * A Candidate whose Candidate Documents are all Approved, plus a Reviewer to generate their Profiles.
 * Required Documents in `pngUploads` are uploaded as PNG images; the rest as PDFs.
 */
const approvedCandidate = async (visaType: string, pngUploads: string[] = []) => {
  const candidate = await candidateWithVisaType(visaType);
  for (const key of pngUploads) await upload(candidate.agent, key, { mimeType: 'image/png', filename: `${key}.png` });
  await uploadAllRequired(candidate.agent, pngUploads);
  await candidate.agent.post('/api/candidate-documents/me/submit');
  const reviewer = (await loginAs(Role.COMPLIANCE)).agent;
  const candidateId = candidate.profile!._id.toString();
  await reviewDocuments(reviewer, candidateId);
  return { reviewer, candidateId };
};

const generateProfiles = async (visaType: string, pngUploads: string[] = []) => {
  const { reviewer, candidateId } = await approvedCandidate(visaType, pngUploads);
  return reviewer.post(`/api/candidates/${candidateId}/compliance`);
};

/** The generated Profile uploaded to S3 under `name`, unzipped. */
const uploadedProfile = (name: string) => {
  const call = jest.mocked(uploadS3File).mock.calls.find(([key]) => key.endsWith(`/${name}.docx`));
  if (!call) throw new Error(`No Profile "${name}" was uploaded`);
  return new PizZip(call[1] as Buffer);
};

const embeddedImages = (zip: PizZip) => Object.keys(zip.files).filter((file) => /media\/image_generated_/.test(file));

const imageBytes = (zip: PizZip) => embeddedImages(zip).map((file) => Buffer.from(zip.file(file)!.asUint8Array()));

const documentText = (zip: PizZip) => zip.file('word/document.xml')!.asText().replace(/<[^>]+>/g, '');

const PROFILES = ['Clarity Staff Profile', 'Eden Future Clarity Staff Profile', 'Swanton Clarity Staff Profile', 'BestLives Staff Profile'];

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('Evidence images in generated Profiles', () => {
  it('embeds the Skilled Worker evidence in every Profile', async () => {
    serveFromS3('one-page.pdf');

    const res = await generateProfiles('SKILLED_WORKER');

    expect(res.status).toBe(200);
    expect(embeddedImages(uploadedProfile('Clarity Staff Profile'))).toHaveLength(4);
    expect(embeddedImages(uploadedProfile('Eden Future Clarity Staff Profile'))).toHaveLength(3);
    expect(embeddedImages(uploadedProfile('Swanton Clarity Staff Profile'))).toHaveLength(3);
    expect(embeddedImages(uploadedProfile('BestLives Staff Profile'))).toHaveLength(2);
    for (const name of PROFILES) {
      const profile = uploadedProfile(name);
      expect(documentText(profile)).not.toContain('{%');
      // PDFs are embedded as PNG renders
      for (const image of imageBytes(profile)) expect(image.subarray(0, 8)).toEqual(PNG_SIGNATURE);
    }
  });

  it('shows the Term Letter in the Clarity student row for a Student', async () => {
    serveFromS3('one-page.pdf', { 'Term Letter': 'image.png' });

    await generateProfiles('STUDENT', ['TermLetter']);

    // Share code, Passport, Term Letter, DBS
    const clarity = uploadedProfile('Clarity Staff Profile');
    expect(embeddedImages(clarity)).toHaveLength(4);
    expect(imageBytes(clarity)).toContainEqual(fixture('image.png'));
  });

  it('leaves slots blank for Required Documents a British/Irish Candidate does not have', async () => {
    serveFromS3('one-page.pdf');

    const res = await generateProfiles('BRITISH_IRISH');

    expect(res.status).toBe(200);
    const clarity = uploadedProfile('Clarity Staff Profile');
    // Passport and DBS only: no share code, Term Letter or COS Letter
    expect(embeddedImages(clarity)).toHaveLength(2);
    expect(documentText(clarity)).not.toContain('{%');
  });

  it('still fills the text fields of the Profiles', async () => {
    serveFromS3('one-page.pdf');

    await generateProfiles('SKILLED_WORKER');

    expect(documentText(uploadedProfile('Clarity Staff Profile'))).toContain('Test Candidate');
  });

  it('embeds an uploaded image unchanged', async () => {
    serveFromS3('one-page.pdf', { Passport: 'image.png' });

    await generateProfiles('BRITISH_IRISH', ['Passport']);

    const images = imageBytes(uploadedProfile('BestLives Staff Profile'));
    expect(images).toContainEqual(fixture('image.png'));
    expect(images).toHaveLength(2);
  });

  it('shows only the first page of a multi-page PDF', async () => {
    serveFromS3('two-page.pdf');

    await generateProfiles('BRITISH_IRISH');

    expect(embeddedImages(uploadedProfile('BestLives Staff Profile'))).toHaveLength(2);
  });

  it('fails without uploading any Profile when a document cannot be downloaded', async () => {
    serveFromS3('one-page.pdf');
    jest.mocked(downloadS3File).mockRejectedValueOnce(new Error('S3 is down'));

    const res = await generateProfiles('BRITISH_IRISH');

    expect(res.status).toBe(500);
    expect(uploadS3File).not.toHaveBeenCalled();
  });

  it('fails without uploading any Profile when a PDF cannot be rendered', async () => {
    serveFromS3('one-page.pdf', { 'Enhanced DBS Certificate': 'corrupt.pdf' });

    const res = await generateProfiles('BRITISH_IRISH');

    expect(res.status).toBe(500);
    expect(res.body.message).toMatch(/EnhancedDbsCertificate/);
    expect(uploadS3File).not.toHaveBeenCalled();
  });
});
