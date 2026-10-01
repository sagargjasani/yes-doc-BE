import mongoose from 'mongoose';
import { sessionStore } from '../../src/app';
import { closeTestServer } from '../helpers/server';

// No real email: sendEmail is an auto-mocked jest.fn(); renderEmail stays real.
jest.mock('../../src/emails/send');

// No real S3: every export is auto-mocked (including ones added later); pure helpers stay real.
jest.mock('../../src/services/s3.service', () => {
  const actual = jest.requireActual('../../src/services/s3.service');
  return {
    ...jest.createMockFromModule<typeof actual>('../../src/services/s3.service'),
    getCandidateS3Key: actual.getCandidateS3Key,
    generatePresignedPostUrl: jest.fn().mockResolvedValue({ url: 'https://s3.test/upload', fields: {} }),
    generatePresignedGetUrl: jest.fn().mockResolvedValue('https://s3.test/download'),
  };
});

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI!);
});

afterEach(async () => {
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await closeTestServer();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  // A suite that never touches a session can finish before the store has connected;
  // wait for it (any store call does) so close() doesn't interrupt its startup.
  await new Promise((resolve) => sessionStore.length(resolve));
  await sessionStore.close();
});
