import { auth } from './firebase';
import { API_BASE } from './api-client';

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

  // 1. Get Presigned URL from Backend
  const response = await fetch(`${API_BASE}/api/r2/presigned-url`, {
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

  let responseData;
  const contentType = response.headers.get('content-type');
  
  if (contentType && contentType.includes('application/json')) {
    responseData = await response.json();
  } else {
    const text = await response.text();
    throw new Error(`Server returned non-JSON response (${response.status}).`);
  }

  if (!response.ok) {
    const errorMsg = responseData.error || responseData.details || `Server error (${response.status})`;
    throw new Error(errorMsg);
  }
  
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

  // 3. Confirm upload success with backend
  const confirmResponse = await fetch(`${API_BASE}/api/r2/confirm-upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    },
    body: JSON.stringify({ key })
  });

  if (!confirmResponse.ok) {
    const confirmData = await confirmResponse.json();
    throw new Error(confirmData.error || 'Failed to verify upload with server');
  }

  return { publicUrl, key };
}
