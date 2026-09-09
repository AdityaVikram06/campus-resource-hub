import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env.local');

// Load environment variables manually
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

const b2Client = new S3Client({
  region: process.env.B2_REGION || 'us-east-005',
  endpoint: `https://${process.env.B2_ENDPOINT || 's3.us-east-005.backblazeb2.com'}`,
  credentials: {
    accessKeyId: process.env.B2_APPLICATION_KEY_ID || '',
    secretAccessKey: process.env.B2_APPLICATION_KEY || '',
  },
  forcePathStyle: true,
});

async function testB2() {
  try {
    console.log('Connecting to Backblaze B2...');
    console.log('Bucket:   ', process.env.B2_BUCKET_NAME || 'Resources-hub');
    console.log('Key ID:   ', process.env.B2_APPLICATION_KEY_ID);
    console.log('Endpoint: ', process.env.B2_ENDPOINT);

    const command = new ListObjectsV2Command({
      Bucket: process.env.B2_BUCKET_NAME || 'Resources-hub',
      MaxKeys: 5,
    });
    const res = await b2Client.send(command);
    console.log('\n🎉 Backblaze B2 connection SUCCESSFUL!');
    console.log('Bucket Name:', res.Name);
    console.log('Key Count:  ', res.KeyCount);
    console.log('Contents:   ', res.Contents ? res.Contents.map(c => ({ key: c.Key, size: c.Size })) : 'Bucket is currently empty (ready for uploads)');
  } catch (err) {
    console.error('\n❌ Backblaze B2 Error:', err);
  }
}

testB2();
