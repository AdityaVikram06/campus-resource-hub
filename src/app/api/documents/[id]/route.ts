import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { deleteFromB2, isB2Configured } from '@/lib/b2';

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await context.params;

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required.' },
        { status: 400 }
      );
    }

    // 1. Authenticate user
    const cookieStore = await cookies();
    const DEFAULT_SUPABASE_URL = 'https://blkmyaqmonpilrdnaeji.supabase.co';
    const DEFAULT_SUPABASE_KEY = 'sb_publishable_8oAmr8-V6X5JTNbg-PlNVg_Z24Pr41P';

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      DEFAULT_SUPABASE_KEY;

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    const currentUserId = (!authError && user) ? user.id : null;

    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Unauthorized: You must be logged in to delete a document.' },
        { status: 401 }
      );
    }

    // 2. If the documentId is directly a B2 key (e.g. rollback), delete from B2
    if (documentId.includes('/')) {
      if (isB2Configured()) {
        await deleteFromB2(documentId).catch(() => {});
      }
      return NextResponse.json({ success: true, message: 'File deleted from B2' });
    }

    // 3. Fetch document record to verify ownership and get file_path
    const { data: doc, error: fetchError } = await supabase
      .from('documents')
      .select('id, uploader_id, file_path, file_name')
      .eq('id', documentId)
      .maybeSingle();

    if (fetchError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // 4. Ownership check
    if (doc.uploader_id !== currentUserId) {
      return NextResponse.json(
        { error: 'Forbidden: You can only delete documents that you personally uploaded.' },
        { status: 403 }
      );
    }

    // 4. Delete physical file from Backblaze B2 bucket
    if (isB2Configured() && doc.file_path) {
      try {
        await deleteFromB2(doc.file_path);
      } catch (b2Err) {
        console.warn(`[B2 Delete Warning]: Could not delete object "${doc.file_path}" from B2:`, b2Err);
        // Continue to delete from DB to prevent orphaned DB records
      }
    }

    // 5. Delete document from database (cascades to document_pages)
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (deleteError) {
      return NextResponse.json(
        { error: `Database deletion failed: ${deleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Document "${doc.file_name}" deleted successfully.`,
    });
  } catch (err: unknown) {
    console.error('[Document Delete Route Error]:', err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Internal Server Error during document deletion.',
      },
      { status: 500 }
    );
  }
}
