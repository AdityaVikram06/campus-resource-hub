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

import { S3Client, GetBucketCorsCommand, PutBucketCorsCommand } from '@aws-sdk/client-s3';

const keyId = process.env.B2_APPLICATION_KEY_ID || '';
const appKey = process.env.B2_APPLICATION_KEY || '';
const region = process.env.B2_REGION || 'us-east-005';
const endpoint = process.env.B2_ENDPOINT ? `https://${process.env.B2_ENDPOINT}` : 'https://s3.us-east-005.backblazeb2.com';
const bucketName = process.env.B2_BUCKET_NAME || 'Resources-hub';

// 1. Configure via S3 API
const b2Client = new S3Client({
  region,
  endpoint,
  credentials: {
    accessKeyId: keyId,
    secretAccessKey: appKey,
  },
  forcePathStyle: true,
});

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://campus-resource-hub-pi.vercel.app',
  'https://campus-resource-hub.vercel.app',
];

async function configureCors() {
  console.log('--- Applying CORS Rules via S3 PutBucketCors ---');
  try {
    await b2Client.send(
      new PutBucketCorsCommand({
        Bucket: 'Resources-hub',
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedOrigins: ALLOWED_ORIGINS,
              AllowedMethods: ['GET', 'HEAD', 'PUT', 'POST'],
              AllowedHeaders: ['*'],
              ExposeHeaders: ['ETag', 'x-amz-request-id', 'Content-Type', 'Content-Length'],
              MaxAgeSeconds: 3600,
            },
          ],
        },
      })
    );
    console.log('✅ PutBucketCorsCommand succeeded with origins:', ALLOWED_ORIGINS);

    const cors = await b2Client.send(new GetBucketCorsCommand({ Bucket: 'Resources-hub' }));
    console.log('✅ Current CORS Rules on Resources-hub:', JSON.stringify(cors.CORSRules, null, 2));
  } catch (err) {
    console.error('❌ S3 PutBucketCors error:', err);
  }

  // 2. Also check Native B2 API
  console.log('\n--- Checking Backblaze Native B2 API ---');
  try {
    const authHeader = 'Basic ' + Buffer.from(`${keyId}:${appKey}`).toString('base64');
    const authRes = await fetch('https://api.backblazeb2.com/b2api/v3/b2_authorize_account', {
      headers: { Authorization: authHeader },
    });
    if (!authRes.ok) {
      console.warn('Native B2 authorize failed:', authRes.status, await authRes.text());
      return;
    }
    const authData = await authRes.json();
    console.log('✅ B2 Native API authorized. apiUrl:', authData.apiInfo?.storageApi?.apiUrl || authData.apiUrl);
    const apiUrl = authData.apiInfo?.storageApi?.apiUrl || authData.apiUrl;
    const authToken = authData.authorizationToken;

    // List buckets to find bucketId for 'Resources-hub'
    const listRes = await fetch(`${apiUrl}/b2api/v3/b2_list_buckets`, {
      method: 'POST',
      headers: { Authorization: authToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: authData.accountId, bucketName: 'Resources-hub' }),
    });
    const listData = await listRes.json();
    const bucket = listData.buckets?.find(b => b.bucketName === 'Resources-hub');
    if (bucket) {
      console.log('Found bucketId:', bucket.bucketId);
      console.log('Current Native corsRules:', JSON.stringify(bucket.corsRules, null, 2));

      // Update bucket CORS rules natively if needed
      const updateRes = await fetch(`${apiUrl}/b2api/v3/b2_update_bucket`, {
        method: 'POST',
        headers: { Authorization: authToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: authData.accountId,
          bucketId: bucket.bucketId,
          corsRules: [
            {
              corsRuleName: 'adobeEmbedCors',
              allowedOrigins: ALLOWED_ORIGINS,
              allowedOperations: [
                'b2_download_file_by_id',
                'b2_download_file_by_name',
                's3_get',
                's3_head',
                's3_put',
                's3_post',
              ],
              allowedHeaders: ['*'],
              exposeHeaders: ['ETag', 'x-amz-request-id', 'Content-Type', 'Content-Length'],
              maxAgeSeconds: 3600,
            },
          ],
        }),
      });
      const updateData = await updateRes.json();
      console.log('✅ Native b2_update_bucket response corsRules:', JSON.stringify(updateData.corsRules, null, 2));
    }
  } catch (b2Err) {
    console.error('❌ Native B2 API error:', b2Err);
  }
}

configureCors();
