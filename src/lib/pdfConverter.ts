import { PDFDocument } from 'pdf-lib';

export const MAX_DOCUMENT_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
export const MAX_AVATAR_FILE_SIZE = 3 * 1024 * 1024; // 3 MB

export const ACCEPTED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/vnd.ms-powerpoint', // .ppt
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'text/plain',
  'text/csv',
];

export const ACCEPTED_EXTENSIONS = [
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.docx',
  '.doc',
  '.pptx',
  '.ppt',
  '.xlsx',
  '.xls',
  '.txt',
  '.csv',
];

export interface ValidationResult {
  valid: boolean;
  error?: string;
  isImage: boolean;
  isPdf?: boolean;
  isOffice?: boolean;
}

export const UNCONVERTIBLE_EXTENSIONS = [
  '.zip',
  '.exe',
  '.mp4',
  '.rar',
  '.tar',
  '.gz',
  '.7z',
  '.iso',
  '.dmg',
  '.bin',
  '.avi',
  '.mov',
  '.mkv',
  '.wmv',
  '.mp3',
  '.wav',
  '.apk',
  '.bat',
  '.sh',
];

export function validateDocumentFile(file: File): ValidationResult {
  // Check size
  if (file.size > MAX_DOCUMENT_FILE_SIZE) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      isImage: false,
      isPdf: false,
      isOffice: false,
      error: `File size (${sizeInMb}MB) exceeds the maximum allowed limit of 20MB.`,
    };
  }

  // Check extension
  const extension = '.' + (file.name.split('.').pop()?.toLowerCase() || '');

  // Explicitly reject unconvertible formats at dropzone
  if (UNCONVERTIBLE_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      isImage: false,
      isPdf: false,
      isOffice: false,
      error: `Format "${extension}" cannot be converted to PDF. Supported formats: PDF, Images (JPG, PNG, WEBP), and Office documents (DOCX, PPTX, XLSX).`,
    };
  }

  const isPdf = file.type === 'application/pdf' || extension === '.pdf';
  const isImage =
    file.type.startsWith('image/') ||
    ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'].includes(extension);
  const isOffice =
    ['.docx', '.doc', '.pptx', '.ppt', '.xlsx', '.xls', '.txt', '.csv'].includes(extension) ||
    ACCEPTED_DOCUMENT_MIME_TYPES.includes(file.type);

  if (!isPdf && !isImage && !isOffice) {
    return {
      valid: false,
      isImage: false,
      isPdf: false,
      isOffice: false,
      error: `Unsupported file format (${extension || file.type}). Please upload a PDF, image, or Office document (DOCX, PPTX, XLSX).`,
    };
  }

  return {
    valid: true,
    isImage,
    isPdf,
    isOffice: !isPdf && !isImage,
  };
}

/**
 * Converts multiple image files (PNG, JPG, WEBP) to one standardized single PDF Blob using pdf-lib.
 * Every selected image is appended as its own page into one single PDF document, strictly in the
 * order they were selected.
 */
export async function convertImagesToPdf(
  files: File[],
  onProgress?: (status: string) => void
): Promise<{ pdfBlob: Blob; pdfFile: File; pageCount: number }> {
  if (!files || files.length === 0) {
    throw new Error('No images provided for PDF conversion');
  }

  const pdfDoc = await PDFDocument.create();

  // Standard A4 dimensions in points: 595.28 x 841.89
  const a4Width = 595.28;
  const a4Height = 841.89;
  const margin = 36; // 0.5 inch margins
  const maxWidth = a4Width - margin * 2;
  const maxHeight = a4Height - margin * 2;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(`Processing page ${i + 1} of ${files.length} (${file.name})...`);

    const arrayBuffer = await file.arrayBuffer();
    let embeddedImage;

    const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
    const isJpg =
      file.type === 'image/jpeg' ||
      file.name.toLowerCase().endsWith('.jpg') ||
      file.name.toLowerCase().endsWith('.jpeg');

    try {
      if (isPng) {
        embeddedImage = await pdfDoc.embedPng(arrayBuffer);
      } else if (isJpg) {
        embeddedImage = await pdfDoc.embedJpg(arrayBuffer);
      } else {
        // For WEBP or other browser-supported images, convert via an offscreen HTML Canvas
        const pngBlob = await convertImageBlobToPng(file);
        const pngBuffer = await pngBlob.arrayBuffer();
        embeddedImage = await pdfDoc.embedPng(pngBuffer);
      }
    } catch {
      // Fallback: load into Image element and convert to PNG via canvas
      const pngBlob = await convertImageBlobToPng(file);
      const pngBuffer = await pngBlob.arrayBuffer();
      embeddedImage = await pdfDoc.embedPng(pngBuffer);
    }

    const { width: imgWidth, height: imgHeight } = embeddedImage;
    const scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight, 1);
    const renderWidth = imgWidth * scale;
    const renderHeight = imgHeight * scale;

    const page = pdfDoc.addPage([a4Width, a4Height]);
    const x = (a4Width - renderWidth) / 2;
    const y = (a4Height - renderHeight) / 2;

    page.drawImage(embeddedImage, {
      x,
      y,
      width: renderWidth,
      height: renderHeight,
    });
  }

  onProgress?.('Finalizing merged PDF document...');
  const pdfBytes = await pdfDoc.save();
  const pdfBlob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });

  // Generate clean filename using the first file name or multi-image label
  const firstFile = files[0];
  const baseName =
    files.length > 1
      ? `${firstFile.name.substring(0, firstFile.name.lastIndexOf('.')) || firstFile.name}_merged`
      : firstFile.name.substring(0, firstFile.name.lastIndexOf('.')) || firstFile.name;
  const convertedFileName = `${baseName}.pdf`;
  const convertedFile = new File([pdfBlob], convertedFileName, { type: 'application/pdf' });

  return {
    pdfBlob,
    pdfFile: convertedFile,
    pageCount: files.length,
  };
}

/**
 * Converts a single image file (PNG, JPG, WEBP) to a standardized PDF Blob using pdf-lib.
 * Retained for backwards compatibility, delegates to convertImagesToPdf.
 */
export async function convertImageToPdf(
  file: File
): Promise<{ pdfBlob: Blob; pdfFile: File; pageCount: number }> {
  return convertImagesToPdf([file]);
}

/**
 * Converts any browser-renderable image Blob to a PNG Blob via HTML5 Canvas.
 */
function convertImageBlobToPng(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('Canvas conversion only available in browser environment'));
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Failed to create canvas context'));
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas toBlob failed'));
        }
      }, 'image/png');
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image into canvas'));
    };

    img.src = objectUrl;
  });
}


