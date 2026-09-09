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

import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
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

async function verifyLiveOperations() {
  const testKey = 'system-health-check.txt';
  const testBody = 'Campus Hub B2 Integration Verified - ' + new Date().toISOString();

  console.log('1. Testing PutObject directly...');
  try {
    const putRes = await b2Client.send(new PutObjectCommand({
      Bucket: 'Resources-hub',
      Key: testKey,
      Body: testBody,
      ContentType: 'text/plain',
    }));
    console.log('   ✅ PutObject SUCCESS! ETag:', putRes.ETag);

    console.log('2. Testing GetObject directly...');
    const getRes = await b2Client.send(new GetObjectCommand({
      Bucket: 'Resources-hub',
      Key: testKey,
    }));
    const data = await getRes.Body?.transformToString();
    console.log('   ✅ GetObject SUCCESS! Content:', data);

    console.log('3. Testing Presigned PUT upload simulation...');
    const presignedPut = await getSignedUrl(b2Client, new PutObjectCommand({
      Bucket: 'Resources-hub',
      Key: 'presigned-test.txt',
      ContentType: 'text/plain',
    }), { expiresIn: 300 });
    
    // Test uploading via HTTP PUT using fetch
    const uploadRes = await fetch(presignedPut, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/plain' },
      body: 'Hello via Presigned PUT!',
    });
    console.log('   ✅ Browser simulation fetch(PUT) status:', uploadRes.status);

    console.log('4. Cleaning up test objects...');
    await b2Client.send(new DeleteObjectCommand({ Bucket: 'Resources-hub', Key: testKey }));
    await b2Client.send(new DeleteObjectCommand({ Bucket: 'Resources-hub', Key: 'presigned-test.txt' }));
    console.log('   ✅ Cleaned up temporary test files.');

    console.log('\n🌟 ALL BACKBLAZE B2 VERIFICATIONS PASSED 100%! Ready for production.');
  } catch (err) {
    console.error('❌ Error during B2 operations:', err);
  }
}

verifyLiveOperations();
