import { S3Client, GetObjectCommand, GetObjectCommandOutput, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'node:stream';
import { TDocumentCategoryValue } from '../models/Document.model';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'hey-doc-documents';

export const uploadS3File = async (
  key: string,
  body: Buffer,
  contentType: string = 'application/octet-stream'
) => {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  return await s3Client.send(command);
};

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

export const deleteS3File = async (key: string) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    return await s3Client.send(command);
  } catch (error) {
    console.error('Failed to delete S3 file:', key, error);
  }
};

export const downloadS3File = (key: string): Promise<Buffer> => {
  return new Promise(async (resolve, reject) => {
    // const s3URL = await getS3FileUrl(key);
    const getObjectParams = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    const getObjectCommand = new GetObjectCommand(getObjectParams);
    // Execute the command to get the object
    const objectData: GetObjectCommandOutput = await s3Client.send(getObjectCommand);

    if (!objectData.Body) {
      reject(new Error(`Failed to retrieve object from S3: ${key}`));
      return;
    }

    const objectStream = Readable.from(objectData.Body as Readable);
    const chunks: Buffer[] = [];
    objectStream.on("data", (chunk) => {
      chunks.push(chunk);
    });
    objectStream.on("end", () => {
      // All data has been received, so combine the chunks into a single buffer
      const combinedData = Buffer.concat(chunks);
      resolve(combinedData);
    });
  });
};

export const getCandidateS3Key = (
  candidateId: string,
  category: TDocumentCategoryValue,
  documentName: string,
  extension?: string
): string => {
  let fileName = documentName;
  if (extension) {
    const cleanExt = extension.startsWith('.') ? extension.slice(1) : extension;
    fileName = `${documentName}.${cleanExt}`;
  }
  return `candidates/${candidateId}/${category}/${fileName}`;
};



