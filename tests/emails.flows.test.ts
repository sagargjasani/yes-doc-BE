import request from 'supertest';
import { Role } from '../src/models/User.model';
import CandidateProfileModel from '../src/models/CandidateProfile.model';
import ReferenceFormModel from '../src/models/ReferenceForm.model';
import { sendEmail } from '../src/emails/send';
import { loginAs } from './helpers/auth';
import { emailsSent } from './helpers/emails';
import { getTestServer } from './helpers/server';

const newPerson = (firstName: string) => ({
  firstName,
  lastName: 'Okafor',
  email: `${firstName.toLowerCase()}-${Date.now()}@example.com`,
  mobile: `07${Math.floor(Math.random() * 1e9).toString().padStart(9, '0')}`,
});

describe('emails to Candidates', () => {
  it('asks for application form changes, quoting the reason and linking to the form', async () => {
    const { profile } = await loginAs(Role.CANDIDATE, { applicationStatus: 'APPLICATION_FORM_SUBMITTED' });
    const reviewer = (await loginAs(Role.COMPLIANCE)).agent;

    const res = await reviewer
      .put(`/api/candidates/application-form/${profile!._id}/changes-required`)
      .send({ reason: 'Employment gap in 2023 is not explained' });

    expect(res.status).toBe(200);
    expect(emailsSent()).toEqual([
      {
        template: 'applicationChangesRequired',
        to: profile!.email,
        props: {
          firstName: 'Test',
          reason: 'Employment gap in 2023 is not explained',
          applicationUrl: expect.stringMatching(/\/candidate\/application-form$/),
        },
      },
    ]);
  });

  // Adding a Candidate sends the same invite, but runs in a transaction the in-memory test DB can't host.
  it('invites a Candidate to set a password', async () => {
    const { user } = await loginAs(Role.CANDIDATE);
    const consultant = (await loginAs(Role.CONSULTANT)).agent;

    const res = await consultant.post('/api/candidates/send-registration-link').send({ userId: user._id.toString() });

    expect(res.status).toBe(200);
    expect(emailsSent()).toEqual([
      {
        template: 'candidateInvite',
        to: user.email,
        props: { firstName: 'Test', setPasswordUrl: expect.stringMatching(/\/create-password\/[0-9a-f]{64}$/) },
      },
    ]);
  });
});

describe('emails to staff users', () => {
  it('invites a new staff user, naming their role', async () => {
    const admin = (await loginAs(Role.ADMIN)).agent;
    const person = newPerson('Priya');

    const res = await admin.post('/api/users').send({ ...person, role: Role.COMPLIANCE });

    expect(res.status).toBe(201);
    expect(emailsSent()).toEqual([
      {
        template: 'staffInvite',
        to: person.email,
        props: {
          firstName: 'Priya',
          role: Role.COMPLIANCE,
          setPasswordUrl: expect.stringMatching(/\/create-password\/[0-9a-f]{64}$/),
        },
      },
    ]);
  });

  it('resends a staff invitation with the same email', async () => {
    const admin = (await loginAs(Role.ADMIN)).agent;
    const { user } = await loginAs(Role.CONSULTANT);

    const res = await admin.post(`/api/users/${user._id}/resend-invitation`);

    expect(res.status).toBe(200);
    expect(emailsSent()).toEqual([
      { template: 'staffInvite', to: user.email, props: expect.objectContaining({ role: Role.CONSULTANT }) },
    ]);
  });
});

describe('password reset', () => {
  it('emails a reset link', async () => {
    const { user } = await loginAs(Role.CONSULTANT);

    const res = await request(getTestServer()).post('/api/auth/forgot-password').send({ email: user.email });

    expect(res.status).toBe(200);
    expect(emailsSent()).toEqual([
      {
        template: 'passwordReset',
        to: user.email,
        props: { firstName: 'Test', resetUrl: expect.stringMatching(/\/reset-password\/[0-9a-f]{64}$/) },
      },
    ]);
  });

  it('reports a failure when the reset email cannot be sent', async () => {
    const { user } = await loginAs(Role.CONSULTANT);
    jest.mocked(sendEmail).mockRejectedValueOnce(new Error('SMTP down'));

    const res = await request(getTestServer()).post('/api/auth/forgot-password').send({ email: user.email });

    expect(res.status).toBe(500);
  });
});

describe('emails to Referees', () => {
  const candidateWithReferee = async () => {
    const { profile } = await loginAs(Role.CANDIDATE);
    await CandidateProfileModel.updateOne(
      { _id: profile!._id },
      { $set: { ref1Name: 'Dr Grace Mensah', ref1Email: 'grace@clinic.example', ref1Company: 'Clinic', ref1Relationship: 'Manager' } }
    );
    return profile!;
  };

  it('asks the Referee for a reference about the Candidate', async () => {
    const profile = await candidateWithReferee();
    const staff = (await loginAs(Role.COMPLIANCE)).agent;

    const res = await staff.post('/api/reference-forms/send').send({ candidateId: profile._id.toString(), refereeIndex: 1 });

    expect(res.status).toBe(200);
    expect(emailsSent()).toEqual([
      {
        template: 'referenceRequest',
        to: 'grace@clinic.example',
        props: {
          refereeName: 'Dr Grace Mensah',
          candidateName: 'Test Candidate',
          referenceUrl: expect.stringMatching(/\/reference-form\/[0-9a-f]{64}$/),
        },
      },
    ]);
  });

  it('sends a rejected Reference Form back to the same Referee with the reason', async () => {
    const profile = await candidateWithReferee();
    const staff = (await loginAs(Role.COMPLIANCE)).agent;
    await staff.post('/api/reference-forms/send').send({ candidateId: profile._id.toString(), refereeIndex: 1 });
    const form = await ReferenceFormModel.findOne({ candidate: profile._id });
    jest.mocked(sendEmail).mockClear();

    const res = await staff.post(`/api/reference-forms/${form!._id}/reject`).send({ reason: 'Please add employment dates' });

    expect(res.status).toBe(200);
    expect(emailsSent()).toEqual([
      {
        template: 'referenceResubmission',
        to: 'grace@clinic.example',
        props: {
          refereeName: 'Dr Grace Mensah',
          candidateName: 'Test Candidate',
          reason: 'Please add employment dates',
          referenceUrl: expect.stringMatching(/\/reference-form\/[0-9a-f]{64}$/),
        },
      },
    ]);
  });
});

describe('letterhead artwork', () => {
  it.each(['header.png', 'footer.png'])('serves %s publicly so webmail clients can load it', async (file) => {
    const res = await request(getTestServer()).get(`/email-assets/${file}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/png');
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
  });
});
