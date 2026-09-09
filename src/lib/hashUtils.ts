/**
 * Computes the SHA-256 hash of a file or blob's binary content using the standard Web Crypto API.
 * This ensures deterministic binary comparison to detect duplicate file uploads.
 */
export async function computeFileSHA256(fileOrBlob: Blob | File): Promise<string> {
  const arrayBuffer = await fileOrBlob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
