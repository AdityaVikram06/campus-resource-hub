/**
 * CAMPUS DOCUMENT HUB: SUPABASE STORAGE -> BACKBLAZE B2 MIGRATION SCRIPT
 *
 * Transfers legacy files from Supabase Storage's 'documents' bucket
 * directly into the Backblaze B2 'Resources-hub' private bucket with key pattern:
 * `${uploader_id}/${Date.now()}-${filename}`,
 * verifies upload via HeadObjectCommand, updates database file_path, and preserves
 * Supabase storage originals until manual verification is complete.
 *
 * Usage:
 *   node scripts/migrate-supabase-to-b2.mjs
 */

import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://blkmyaqmonpilrdnaeji.supabase.co';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_8oAmr8-V6X5JTNbg-PlNVg_Z24Pr41P';

const B2_KEY_ID = process.env.B2_APPLICATION_KEY_ID;
const B2_APP_KEY = process.env.B2_APPLICATION_KEY;
const B2_BUCKET = process.env.B2_BUCKET_NAME || 'Resources-hub';
const B2_ENDPOINT = process.env.B2_ENDPOINT || 's3.us-east-005.backblazeb2.com';
const B2_REGION = process.env.B2_REGION || 'us-east-005';

console.log('===============================================================');
console.log('  CAMPUS HUB: SUPABASE STORAGE -> BACKBLAZE B2 FILE MIGRATION  ');
console.log('===============================================================');

if (!B2_KEY_ID || !B2_APP_KEY) {
  console.error('❌ Error: B2_APPLICATION_KEY_ID and B2_APPLICATION_KEY must be set in .env.local.');
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️  NOTICE: SUPABASE_SERVICE_ROLE_KEY is not set in .env.local.');
  console.warn('   The script will attempt reading using the anon key, but if Row Level Security (RLS)');
  console.warn('   is active, Supabase requires the service_role key to bypass RLS and access storage files.');
  console.warn('   Get your service_role key from: Supabase Dashboard > Settings > API > service_role secret\n');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const b2Client = new S3Client({
  region: B2_REGION,
  endpoint: `https://${B2_ENDPOINT}`,
  credentials: {
    accessKeyId: B2_KEY_ID,
    secretAccessKey: B2_APP_KEY,
  },
  forcePathStyle: true,
});

async function runMigration() {
  console.log(`📦 Target Backblaze B2 Bucket: ${B2_BUCKET} (${B2_ENDPOINT})`);
  console.log(`🌐 Supabase Project: ${SUPABASE_URL}`);

  // 1. Fetch documents from Supabase database
  console.log('\n🔍 Querying documents table...');
  const { data: docs, error: dbError } = await supabase
    .from('documents')
    .select('id, title, file_path, file_name, uploader_id, file_size, file_type');

  if (dbError) {
    console.error('❌ Failed to read documents from Supabase database:', dbError.message);
    process.exit(1);
  }

  if (!docs || docs.length === 0) {
    console.log('ℹ️  Returned 0 document records.');
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('👉 Since 13 documents exist in Supabase Table Editor, this confirms RLS blocked the anon key.');
      console.log('   Please add SUPABASE_SERVICE_ROLE_KEY to .env.local so this migration script can read and update the rows.');
    }
    return;
  }

  console.log(`📄 Found ${docs.length} total document records in database.`);

  let migratedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  const migrationLog = [];

  for (const doc of docs) {
    console.log(`\n---------------------------------------------------------------`);
    console.log(`Processing [${doc.id}]: "${doc.title}"`);
    console.log(`Current file_path: "${doc.file_path}"`);

    // Check if file_path already looks like a B2 key or exists in B2
    let alreadyInB2 = false;
    try {
      await b2Client.send(
        new HeadObjectCommand({
          Bucket: B2_BUCKET,
          Key: doc.file_path,
        })
      );
      alreadyInB2 = true;
      console.log(`✅ File is already present in Backblaze B2 at "${doc.file_path}". Skipping.`);
    } catch {
      alreadyInB2 = false;
    }

    if (alreadyInB2) {
      skippedCount++;
      migrationLog.push({ id: doc.id, title: doc.title, status: 'SKIPPED_ALREADY_IN_B2', key: doc.file_path });
      continue;
    }

    // Step A: Attempt download from Supabase Storage 'documents' bucket
    console.log(`⬇️  Downloading "${doc.file_path}" from Supabase Storage 'documents' bucket...`);
    let fileBlob = null;
    let downloadError = null;

    try {
      const res = await supabase.storage.from('documents').download(doc.file_path);
      fileBlob = res.data;
      downloadError = res.error;
    } catch (err) {
      downloadError = err;
    }

    if (downloadError || !fileBlob) {
      console.warn(
        `⚠️  Failed to download "${doc.file_path}" from Supabase Storage:`,
        downloadError?.message || 'File not found.'
      );
      failedCount++;
      migrationLog.push({
        id: doc.id,
        title: doc.title,
        status: 'DOWNLOAD_FAILED',
        error: downloadError?.message || 'File not found in Supabase Storage',
      });
      continue;
    }

    const arrayBuffer = await fileBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Step B: Formulate standard B2 key: ${uploader_id}/${timestamp}-${filename}
    const cleanName = (doc.file_name || path.basename(doc.file_path) || 'document.pdf').replace(
      /[^a-zA-Z0-9._-]/g,
      '_'
    );
    const targetB2Key = `${doc.uploader_id}/${Date.now()}-${cleanName}`;

    // Step C: Determine Content-Type
    const ext = path.extname(cleanName).toLowerCase().replace('.', '');
    const mimeTypes = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      doc: 'application/msword',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ppt: 'application/vnd.ms-powerpoint',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      xls: 'application/vnd.ms-excel',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // Step D: Upload to Backblaze B2
    console.log(`⬆️  Uploading ${buffer.length} bytes to B2 bucket "${B2_BUCKET}" as "${targetB2Key}"...`);
    try {
      await b2Client.send(
        new PutObjectCommand({
          Bucket: B2_BUCKET,
          Key: targetB2Key,
          Body: buffer,
          ContentType: contentType,
        })
      );

      // Step E: Verify B2 upload with HeadObjectCommand before modifying database
      await b2Client.send(
        new HeadObjectCommand({
          Bucket: B2_BUCKET,
          Key: targetB2Key,
        })
      );
      console.log(`✅ HeadObject verified object in Backblaze B2: ${targetB2Key}`);

      // Step F: Update database row file_path to point to new B2 key
      const { error: updateError } = await supabase
        .from('documents')
        .update({ file_path: targetB2Key })
        .eq('id', doc.id);

      if (updateError) {
        throw new Error(`Database update failed: ${updateError.message}`);
      }

      console.log(`📝 Updated Supabase documents.file_path -> "${targetB2Key}"`);
      console.log(`🔒 Preserved original file in Supabase Storage for safety (as requested).`);

      migratedCount++;
      migrationLog.push({ id: doc.id, title: doc.title, status: 'MIGRATED_SUCCESS', newKey: targetB2Key });
    } catch (b2Err) {
      console.error(`❌ Migration failed for "${doc.title}":`, b2Err);
      failedCount++;
      migrationLog.push({ id: doc.id, title: doc.title, status: 'B2_UPLOAD_FAILED', error: b2Err.message });
    }
  }

  console.log('\n===============================================================');
  console.log('                    MIGRATION SUMMARY                          ');
  console.log('===============================================================');
  console.log(`✅ Successfully Migrated to B2: ${migratedCount}`);
  console.log(`⏭️  Already In B2 (Skipped):     ${skippedCount}`);
  console.log(`⚠️  Failed / Untouched:          ${failedCount}`);
  console.log('===============================================================');
  console.log('Detailed Log:');
  console.log(JSON.stringify(migrationLog, null, 2));
  console.log('===============================================================\n');
}

runMigration().catch((err) => {
  console.error('Fatal Migration Error:', err);
  process.exit(1);
});
