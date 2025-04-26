// Get our Cloudinary settings from the secret .env file
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;    // Your Cloudinary account name
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_PRESET;     // Your upload settings name

// Main function to upload images to Cloudinary
// It takes an image file and returns the internet address (URL) where the image will be stored
export const uploadToCloudinary = async (imageFile: File): Promise<string> => {
  try {
    // First, check if we have all the required Cloudinary information
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      throw new Error('Missing Cloudinary configuration. Please check your .env file.');
    }

    // Create a package to send our image
    const formData = new FormData();
    formData.append('file', imageFile);              // Add the image file
    formData.append('upload_preset', UPLOAD_PRESET); // Add our upload settings
    formData.append('cloud_name', CLOUD_NAME);       // Add our account name

    // Send the image to Cloudinary's servers
    const uploadResult = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: 'POST',  // Tell it we're sending data
        body: formData   // The image and settings we prepared
      }
    );

    // Check if Cloudinary accepted our image
    if (!uploadResult.ok) {
      const errorData = await uploadResult.json();
      console.error('Cloudinary Error:', errorData);
      throw new Error(errorData.error?.message || 'Failed to upload image');
    }

    // Get the response from Cloudinary
    const data = await uploadResult.json();
    // Make sure we got back the image URL
    if (!data.secure_url) {
      throw new Error('No URL received from Cloudinary');
    }

    // Return the web address where our image is now stored
    return data.secure_url;
    
  } catch (error) {
    // If anything goes wrong, log the error and let others know
    console.error('Upload failed:', error);
    throw error;
  }
};

/* How to use this function:

1. Make sure you have a .env file with:
   VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
   VITE_CLOUDINARY_PRESET=your_upload_preset

2. In your component:
   const handleUpload = async (event) => {
     const file = event.target.files[0];
     try {
       const imageUrl = await uploadToCloudinary(file);
       console.log('Image uploaded to:', imageUrl);
     } catch (error) {
       console.error('Upload failed:', error);
     }
   }

3. In your JSX:
   <input type="file" onChange={handleUpload} />
*/