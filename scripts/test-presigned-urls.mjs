import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env.local');

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const b2Client = new S3Client({
  region: process.env.B2_REGION || 'us-east-005',
  endpoint: `https://${process.env.B2_ENDPOINT || 's3.us-east-005.backblazeb2.com'}`,
  credentials: {
    accessKeyId: process.env.B2_APPLICATION_KEY_ID || '',
    secretAccessKey: process.env.B2_APPLICATION_KEY || '',
  },
  forcePathStyle: true,
});

async function testPresigned() {
  console.log('Testing offline HMAC presigned URL generation with Backblaze credentials...');
  
  // 1. Test Presigned PUT
  const putCommand = new PutObjectCommand({
    Bucket: 'Resources-hub',
    Key: 'test-user/sample.docx',
    ContentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const putUrl = await getSignedUrl(b2Client, putCommand, { expiresIn: 1800 });
  console.log('\n✅ Presigned PUT URL generated successfully!');
  console.log('PUT URL:', putUrl.slice(0, 120) + '...');

  // 2. Test Presigned GET
  const getCommand = new GetObjectCommand({
    Bucket: 'Resources-hub',
    Key: 'test-user/sample.docx',
    ResponseContentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const getUrl = await getSignedUrl(b2Client, getCommand, { expiresIn: 1800 });
  console.log('\n✅ Presigned GET URL generated successfully!');
  console.log('GET URL:', getUrl.slice(0, 120) + '...');
}

testPresigned();
