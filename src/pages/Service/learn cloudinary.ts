// Get our Cloudinary account details from the secret .env file
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;  // Like your Cloudinary username
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_PRESET;         // Like your Cloudinary password

// This function takes an image and gives us back its internet address (URL)
export const uploadToCloudinary = async (imageFile: File): Promise<string> => {
  try {
    // Step 1: Prepare the image for sending
    const imagePackage = new FormData();        // Create a digital package
    imagePackage.append('file', imageFile);     // Put the image in the package
    imagePackage.append('preset', UPLOAD_PRESET);      // Add our special key to unlock Cloudinary

    // Step 2: Send the image to Cloudinary's website
    const uploadResult = await fetch(
      // The website address where we're sending our image
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, 
      {
        method: 'POST',                // Tell the website we're sending data
        body: imagePackage            // Our package containing the image
      }
    );
    
    // Step 3: Get back the web address where our image is stored
    const { secure_url } = await uploadResult.json();  // Get the image's new web address
    return secure_url;                                // Send back the web address
    
  } catch (error) {
    // If anything goes wrong (like no internet or wrong password)
    console.error('Upload failed:', error);  // Show what went wrong
    throw error;                            // Tell the app there was a problem
  }
};

/* How to use this function:

// 1. When user selects an image:
const handleImageUpload = async (event) => {
  const imageFile = event.target.files[0];  // Get the selected image
  
  try {
    // 2. Upload the image and get its web address
    const imageUrl = await uploadToCloudinary(imageFile);
    
    // 3. Now you can use imageUrl to show or save the image
    console.log('Image is now online at:', imageUrl);
  } catch (error) {
    console.log('Oops! Upload failed');
  }
}

// In your HTML:
<input type="file" onChange={handleImageUpload} />
*/
