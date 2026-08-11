import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'hey-doc-documents';

export const generatePresignedPostUrl = async (
  key: string,
  contentType: string,
  maxSize: number
) => {
  const { url, fields } = await createPresignedPost(s3Client, {
    Bucket: BUCKET_NAME,
    Key: key,
    Conditions: [
      ['content-length-range', 0, maxSize], // max size limit
      ['eq', '$Content-Type', contentType], // specific content type
    ],
    Fields: {
      'Content-Type': contentType,
    },
    Expires: 600, // 10 minutes
  });

  return { url, fields };
};

export const generatePresignedGetUrl = async (key: string) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  // URL expires in 15 minutes (900 seconds)
  const url = await getSignedUrl(s3Client, command, { expiresIn: 900 });
  return url;
};
