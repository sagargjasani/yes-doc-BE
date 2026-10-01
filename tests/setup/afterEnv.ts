import mongoose from 'mongoose';
import { sessionStore } from '../../src/app';

// No real email: every mailer function is an auto-mocked jest.fn().
jest.mock('../../src/utils/mailer');

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
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await sessionStore.close();
});
