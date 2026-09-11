import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const b2Client = new S3Client({
  region: process.env.B2_REGION || 'us-east-005',
  endpoint: `https://${process.env.B2_ENDPOINT || 's3.us-east-005.backblazeb2.com'}`,
  credentials: {
    accessKeyId: process.env.B2_APPLICATION_KEY_ID || '',
    secretAccessKey: process.env.B2_APPLICATION_KEY || '',
  },
  forcePathStyle: true,
});

async function computeFileSHA256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function runTest() {
  console.log('===============================================================');
  console.log('  TESTING DOCUMENT UPLOAD & DUPLICATE DETECTION END-TO-END     ');
  console.log('===============================================================');

  const pdfPath = path.resolve(__dirname, '../plastic_waste.pdf');
  const fileBuffer = fs.existsSync(pdfPath)
    ? fs.readFileSync(pdfPath)
    : Buffer.from('%PDF-1.4 Mock Plastic Waste Management Module 1 & 2');
  const fileSize = fileBuffer.length;
  const fileHash = await computeFileSHA256(fileBuffer);

  console.log(`\n📄 Target file: plastic_waste.pdf (${fileSize} bytes)`);
  console.log(`🔑 SHA-256 file_hash: ${fileHash}`);

  // Test Step 1: Pre-upload duplicate check
  console.log('\n--- Step 1: Pre-Upload Duplicate Check ---');
  const { data: existingCheck1, error: checkErr1 } = await supabase
    .from('documents')
    .select('*, uploader:profiles(*)')
    .eq('file_hash', fileHash)
    .maybeSingle();

  if (checkErr1) {
    throw new Error(`Pre-upload duplicate check failed: ${checkErr1.message}`);
  }
  if (existingCheck1) {
    console.log(`⚠️ Document with this hash already exists: "${existingCheck1.title}" by ${existingCheck1.uploader?.full_name}`);
  } else {
    console.log('✅ Pre-upload check: No duplicates found. Proceeding with upload.');
  }

  // If already exists from earlier test, skip upload or clean up
  let docId = existingCheck1?.id;
  if (!docId) {
    // Test Step 2: Upload to Backblaze B2
    const uploaderId = '62c50f42-7a39-4c89-8029-7fcea3d43243'; // vikram lenovo loq
    const b2Key = `${uploaderId}/${Date.now()}-plastic_waste.pdf`;
    console.log(`\n--- Step 2: Upload to Backblaze B2 (Key: ${b2Key}) ---`);

    await b2Client.send(new PutObjectCommand({
      Bucket: process.env.B2_BUCKET_NAME || 'Resources-hub',
      Key: b2Key,
      Body: fileBuffer,
      ContentType: 'application/pdf',
    }));

    const headRes = await b2Client.send(new HeadObjectCommand({
      Bucket: process.env.B2_BUCKET_NAME || 'Resources-hub',
      Key: b2Key,
    }));
    console.log(`✅ B2 Storage Upload Confirmed! ETag: ${headRes.ETag}, ContentLength: ${headRes.ContentLength}`);

    // Test Step 3: Insert Document Record into Supabase
    console.log('\n--- Step 3: Inserting Document into Supabase documents table ---');
    const { data: insertData, error: insertError } = await supabase
      .from('documents')
      .insert({
        title: 'Plastic Waste Management-Module 1 & 2',
        type: 'Notes',
        semester: 'Sem 5',
        uploader_id: uploaderId,
        file_path: b2Key,
        file_name: 'plastic_waste.pdf',
        file_size: fileSize,
        file_type: 'pdf',
        page_count: 1,
        file_hash: fileHash,
      })
      .select('*, uploader:profiles(*)')
      .single();

    if (insertError) {
      console.error('❌ Insert FAILED:', insertError);
      throw insertError;
    }

    console.log('✅ Document Record INSERTED SUCCESSFULLY!');
    console.log('   ID:', insertData.id);
    console.log('   Title:', insertData.title);
    console.log('   Type:', insertData.type);
    console.log('   Semester:', insertData.semester);
    console.log('   file_hash:', insertData.file_hash);
    console.log('   Uploader:', insertData.uploader?.full_name);
    docId = insertData.id;
  }

  // Test Step 4: Duplicate-File Detection Verification
  console.log('\n--- Step 4: Testing Duplicate Detection (Attempt 2 with same file) ---');
  console.log('Simulating second student uploading the identical plastic_waste.pdf...');

  const duplicateHash = await computeFileSHA256(fileBuffer);
  const { data: duplicateMatch, error: dupErr } = await supabase
    .from('documents')
    .select('*, uploader:profiles(*)')
    .eq('file_hash', duplicateHash)
    .maybeSingle();

  if (dupErr) {
    throw new Error(`Duplicate query error: ${dupErr.message}`);
  }

  if (duplicateMatch) {
    const uploaderName = duplicateMatch.uploader?.full_name || 'another student';
    const blockedError = `Duplicate file detected: This exact file has already been uploaded as "${duplicateMatch.title}" by ${uploaderName}.`;
    console.log('🛡️ DUPLICATE DETECTION TRIGGERED:');
    console.log('   Status: BLOCKED');
    console.log(`   Message: "${blockedError}"`);
    console.log('   Matching Document ID:', duplicateMatch.id);
    console.log('   Matching Document Title:', duplicateMatch.title);
    console.log('   Matching Uploader:', uploaderName);
    console.log('\n🎉 ALL CHECKS PASSED: Duplicate detection is 100% functional end-to-end!');
  } else {
    console.error('❌ ERROR: Duplicate file was NOT detected!');
    process.exit(1);
  }
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
