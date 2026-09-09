/**
 * CAMPUS DOCUMENT HUB: SUPABASE STORAGE -> BACKBLAZE B2 MIGRATION SCRIPT
 *
 * Transfers all document files from Supabase Storage's 'documents' bucket
 * directly into the Backblaze B2 'Resources-hub' private bucket, updates
 * database file_path references, and safely deletes the originals.
 *
 * Usage:
 *   node scripts/migrate-supabase-to-b2.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://blkmyaqmonpilrdnaeji.supabase.co';
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
  console.error('   Please generate an Application Key scoped to "Resources-hub" from your Backblaze dashboard.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const b2Client = new S3Client({
  region: B2_REGION,
  endpoint: `https://${B2_ENDPOINT}`,
  credentials: {
    accessKeyId: B2_KEY_ID,
    secretAccessKey: B2_APP_KEY,
  },
});

async function runMigration() {
  console.log(`\n📦 Backblaze B2 Target Bucket: ${B2_BUCKET} (${B2_ENDPOINT})`);
  console.log(`🌐 Supabase Project URL: ${SUPABASE_URL}`);

  // 1. Fetch documents from Supabase database
  console.log('\n🔍 Scanning documents table for storage migration candidates...');
  const { data: docs, error: dbError } = await supabase
    .from('documents')
    .select('id, title, file_path, file_name, uploader_id, file_size');

  if (dbError) {
    console.error('❌ Failed to read documents from Supabase database:', dbError.message);
    process.exit(1);
  }

  if (!docs || docs.length === 0) {
    console.log('ℹ️  No documents found in Supabase database. Migration not required.');
    return;
  }

  console.log(`📄 Found ${docs.length} total document records.`);

  let migratedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const doc of docs) {
    console.log(`\n---------------------------------------------------------------`);
    console.log(`Processing [${doc.id}]: "${doc.title}"`);
    console.log(`Current file_path: ${doc.file_path}`);

    // Check if file already exists in B2
    let alreadyInB2 = false;
    try {
      await b2Client.send(
        new HeadObjectCommand({
          Bucket: B2_BUCKET,
          Key: doc.file_path,
        })
      );
      alreadyInB2 = true;
      console.log(`✅ File is already present in Backblaze B2 (${doc.file_path}). Skipping download.`);
    } catch {
      alreadyInB2 = false;
    }

    if (alreadyInB2) {
      skippedCount++;
      continue;
    }

    // Attempt download from Supabase Storage 'documents' bucket
    console.log(`⬇️  Downloading from Supabase Storage 'documents' bucket...`);
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('documents')
      .download(doc.file_path);

    if (downloadError || !fileBlob) {
      console.warn(
        `⚠️  Could not download "${doc.file_path}" from Supabase Storage:`,
        downloadError?.message || 'File not found.'
      );
      failedCount++;
      continue;
    }

    const arrayBuffer = await fileBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Target B2 key: retain structure or standard <uploader_id>/<doc_id>.pdf
    const targetKey = doc.file_path;

    // Upload to Backblaze B2
    console.log(`⬆️  Uploading ${buffer.length} bytes to B2 bucket "${B2_BUCKET}" at key "${targetKey}"...`);
    try {
      await b2Client.send(
        new PutObjectCommand({
          Bucket: B2_BUCKET,
          Key: targetKey,
          Body: buffer,
          ContentType: 'application/pdf',
        })
      );

      // Verify B2 presence
      await b2Client.send(
        new HeadObjectCommand({
          Bucket: B2_BUCKET,
          Key: targetKey,
        })
      );
      console.log(`✅ Verified Backblaze B2 object: ${targetKey}`);

      // Update database file_path if changed
      if (doc.file_path !== targetKey) {
        await supabase
          .from('documents')
          .update({ file_path: targetKey })
          .eq('id', doc.id);
        console.log(`📝 Updated database file_path to: ${targetKey}`);
      }

      // Safely delete from Supabase storage once confirmed working
      console.log(`🗑️  Removing legacy original from Supabase Storage 'documents' bucket...`);
      await supabase.storage.from('documents').remove([doc.file_path]);

      migratedCount++;
      console.log(`🎉 Successfully migrated document: "${doc.title}"`);
    } catch (b2Err) {
      console.error(`❌ Failed to upload to Backblaze B2:`, b2Err);
      failedCount++;
    }
  }

  console.log('\n===============================================================');
  console.log('                    MIGRATION SUMMARY                          ');
  console.log('===============================================================');
  console.log(`✅ Successfully Migrated: ${migratedCount}`);
  console.log(`⏭️  Already In B2:        ${skippedCount}`);
  console.log(`⚠️  Failed / Missing:     ${failedCount}`);
  console.log('===============================================================\n');
}

runMigration().catch((err) => {
  console.error('Fatal Migration Error:', err);
  process.exit(1);
});
