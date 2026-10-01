import type TestAgent from 'supertest/lib/agent';
import { Role } from '../../src/models/User.model';
import { DocumentCategory } from '../../src/models/Document.model';
import type { DocumentChecklist } from '../../src/services/candidateDocument.service';
import { loginAs } from './auth';

export const APPROVED = { applicationStatus: 'APPLICATION_FORM_APPROVED' };

interface UploadOptions {
  mimeType?: string;
  filename?: string;
  category?: string;
  candidateId?: string;
}

/** Runs the presigned-upload + confirm-upload flow the way the web app does. */
export const upload = async (agent: TestAgent, documentName: string, options: UploadOptions = {}) => {
  const { mimeType = 'application/pdf', filename = `${documentName}.pdf`, category = DocumentCategory.DOCUMENT } = options;
  const body = { contentType: mimeType, category, size: 1000, documentName, candidateId: options.candidateId };

  const presigned = await agent.post('/api/documents/presigned-upload').send({ ...body, filename });
  if (presigned.status !== 200) return { presigned, confirm: null };

  const confirm = await agent.post('/api/documents/confirm-upload').send({
    ...body,
    s3Key: presigned.body.data.s3Key,
    originalName: filename,
    mimeType,
  });
  return { presigned, confirm };
};

export const getChecklist = async (agent: TestAgent): Promise<DocumentChecklist> =>
  (await agent.get('/api/candidate-documents/me')).body.data;

export const checklistItem = async (agent: TestAgent, key: string) =>
  (await getChecklist(agent)).checklist.find((item) => item.key === key);

export const candidateWithVisaType = async (visaType = 'BRITISH_IRISH') => {
  const session = await loginAs(Role.CANDIDATE, APPROVED);
  await session.agent.put('/api/candidate-documents/me/visa-type').send({ visaType });
  return session;
};

/** Uploads a file for every Required Document that applies to the Candidate's Visa Type, except `skip`. */
export const uploadAllRequired = async (agent: TestAgent, skip: string[] = []) => {
  const { checklist } = await getChecklist(agent);
  for (const { key } of checklist) {
    if (!skip.includes(key)) await upload(agent, key);
  }
};

/** A Candidate who has uploaded every applicable Required Document and made a Document Submission. */
export const submittedCandidate = async (visaType = 'BRITISH_IRISH') => {
  const session = await candidateWithVisaType(visaType);
  await uploadAllRequired(session.agent);
  await session.agent.post('/api/candidate-documents/me/submit');
  return session;
};
