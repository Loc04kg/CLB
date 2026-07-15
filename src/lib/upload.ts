import api from './api';

/**
 * Uploads an image file to the server and returns the public URL.
 * Replaces the previous Base64 string generation approach.
 */
export async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);

  const response = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  // The server returns a relative path like /uploads/filename.jpg
  // In production, you might want to prepend the base URL depending on your setup.
  return import.meta.env.VITE_API_URL.replace('/api', '') + response.data.url;
}
