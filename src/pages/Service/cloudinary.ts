// Cloudinary image upload utility
// Reads Cloudinary settings from environment variables

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME; // Cloudinary account name
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_PRESET;  // Cloudinary upload preset

/**
 * Uploads an image file to Cloudinary and returns the secure URL.
 * @param imageFile - The image file to upload
 * @returns The secure URL of the uploaded image
 * @throws Error if configuration is missing or upload fails
 */
export const uploadToCloudinary = async (imageFile: File): Promise<string> => {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary configuration missing. Check your .env file.');
  }

  const formData = new FormData();
  formData.append('file', imageFile);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('cloud_name', CLOUD_NAME);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    let errorMsg = 'Failed to upload image';
    try {
      const errorData = await response.json();
      errorMsg = errorData.error?.message || errorMsg;
      console.error('Cloudinary Error:', errorData);
    } catch (e) {
      // Ignore JSON parse errors
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  if (!data.secure_url) {
    throw new Error('No secure_url returned from Cloudinary');
  }
  return data.secure_url;
};