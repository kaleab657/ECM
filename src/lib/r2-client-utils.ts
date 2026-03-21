import { auth } from './firebase';
import { apiFetch, API_BASE } from './api-client';

export interface UploadResult {
  publicUrl: string;
  key: string;
}

/**
 * Uploads a file to Cloudflare R2 via the backend presigned URL flow.
 * @param file The file to upload
 * @param folder The folder in the bucket (e.g., 'listings', 'chats')
 * @returns The public URL and key of the uploaded file
 */
export async function uploadToR2(file: File, folder: string = 'general'): Promise<UploadResult> {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be logged in to upload files');

  const idToken = await user.getIdToken();

  // 1. Get Presigned URL from Backend (via apiFetch for proper credentials/retry)
  const responseData = await apiFetch('/api/r2/presigned-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    },
    body: JSON.stringify({ 
      fileName: file.name, 
      fileType: file.type,
      folder
    })
  });

  const { uploadUrl, publicUrl, key } = responseData;
  if (!uploadUrl || !publicUrl || !key) {
    throw new Error('Server returned invalid upload configuration');
  }

  // 2. Upload the file directly to Cloudflare R2
  // On Android, files from the gallery are content:// URIs.
  // Reading as ArrayBuffer first ensures the WebView can send the bytes.
  try {
    const fileBuffer = await file.arrayBuffer();
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: fileBuffer,
      headers: {
        'Content-Type': file.type
      }
    });

    if (!uploadResponse.ok) {
      throw new Error(`R2 Storage rejected the upload (Status: ${uploadResponse.status}).`);
    }
  } catch (uploadErr: any) {
    if (uploadErr.message === 'Failed to fetch') {
      throw new Error('R2 Upload blocked by browser (CORS). Please ensure your R2 bucket CORS policy allows PUT requests from this domain. See R2_CORS_SETUP.md for instructions.');
    }
    throw uploadErr;
  }

  // 3. Confirm upload success with backend (via apiFetch for proper credentials/retry)
  await apiFetch('/api/r2/confirm-upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    },
    body: JSON.stringify({ key })
  });

  return { publicUrl, key };
}
