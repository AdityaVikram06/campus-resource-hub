import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME || 'Resources-hub';
export const B2_ENDPOINT = process.env.B2_ENDPOINT || 's3.us-east-005.backblazeb2.com';
export const B2_REGION = process.env.B2_REGION || 'us-east-005';
export const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
export const B2_FREE_TIER_QUOTA_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB

export const b2Client = new S3Client({
  region: B2_REGION,
  endpoint: `https://${B2_ENDPOINT}`,
  credentials: {
    accessKeyId: process.env.B2_APPLICATION_KEY_ID || '',
    secretAccessKey: process.env.B2_APPLICATION_KEY || '',
  },
  forcePathStyle: true,
});

export function isB2Configured(): boolean {
  return Boolean(
    process.env.B2_APPLICATION_KEY_ID &&
    process.env.B2_APPLICATION_KEY &&
    process.env.B2_APPLICATION_KEY_ID !== 'your_application_key_id' &&
    process.env.B2_APPLICATION_KEY !== 'your_application_key'
  );
}

/**
 * Returns standard MIME type for given file extension or storage key
 */
export function getMimeType(keyOrFilename: string): string {
  const ext = keyOrFilename.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'doc':
      return 'application/msword';
    case 'pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case 'ppt':
      return 'application/vnd.ms-powerpoint';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'pdf':
      return 'application/pdf';
    case 'txt':
      return 'text/plain';
    case 'csv':
      return 'text/csv';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Generate short-lived presigned upload URL for direct browser PUT to B2 bucket
 */
export async function getPresignedUploadUrl(params: {
  key: string;
  contentType?: string;
  expiresIn?: number;
}) {
  const mime = params.contentType || getMimeType(params.key);
  const command = new PutObjectCommand({
    Bucket: B2_BUCKET_NAME,
    Key: params.key,
    ContentType: mime,
  });

  return await getSignedUrl(b2Client, command, {
    expiresIn: params.expiresIn || 1800, // 30 minutes
  });
}

/**
 * Generate short-lived presigned GET URL for document viewing (Adobe PDF or MS Office Online Viewer) & download
 */
export async function getPresignedViewUrl(params: {
  key: string;
  responseContentType?: string;
  expiresIn?: number;
}) {
  const mime = params.responseContentType || getMimeType(params.key);
  const command = new GetObjectCommand({
    Bucket: B2_BUCKET_NAME,
    Key: params.key,
    ResponseContentType: mime,
  });

  return await getSignedUrl(b2Client, command, {
    expiresIn: params.expiresIn || 1800, // 30 minutes
  });
}

/**
 * Delete an object from Backblaze B2 Resources-hub bucket
 */
export async function deleteFromB2(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: B2_BUCKET_NAME,
    Key: key,
  });

  return await b2Client.send(command);
}
