// Runs before each test file's modules load, so src/config/env picks these up
// (dotenv never overrides variables that are already set).
const baseUri = process.env.MONGO_BASE_URI;
if (!baseUri) {
  throw new Error('MONGO_BASE_URI is not set: tests must run through jest globalSetup');
}

// One database per worker keeps parallel test files apart.
process.env.MONGO_URI = `${baseUri.replace(/\/$/, '')}/hey-doc-test-${process.env.JEST_WORKER_ID ?? '1'}`;
process.env.NODE_ENV = 'test';

// Fake AWS credentials so nothing can reach real S3 even if a call slips past the mocks.
process.env.AWS_ACCESS_KEY_ID = 'test';
process.env.AWS_SECRET_ACCESS_KEY = 'test';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_S3_BUCKET_NAME = 'hey-doc-test';
