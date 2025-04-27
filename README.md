# SellmyPi Frontend

A modern web application for Pi Network cryptocurrency transactions.

## Environment Configuration

The application uses environment variables to configure API endpoints and other services. This allows for different settings between local development and production.

### API URLs

API URLs are configured using the `VITE_API_URL` environment variable. This value is used throughout the application to connect to the backend.

#### Local Development
For local development, the API URL defaults to `http://localhost:3000` if no environment variable is provided.

#### Production
For production, you need to set `VITE_API_URL` to your production API domain, such as `https://api.sellmypi.com`.

### Setting Up Environment Variables

1. Create a file named `.env` in the project root
2. Add the following variables:

```
# API Configuration
VITE_API_URL=https://your-production-api.com

# Cloudinary Configuration 
VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
VITE_CLOUDINARY_PRESET=your_cloudinary_upload_preset
```

### When to Use Each URL

- Local Development: When running locally for testing
- Production: When deploying to production servers

### Technical Implementation

API URLs are managed through the `src/config.ts` file, which provides:

- Centralized configuration management
- Fallback values for when environment variables aren't set
- Helper functions for constructing full API endpoints

Example usage in code:

```typescript
import { getApiUrl } from "../config";

// Instead of hardcoded URLs like:
// fetch('http://localhost:3000/api/transactions')

// Use the API URL from configuration:
fetch(getApiUrl('transactions'))
```

This ensures your application will work correctly in both development and production environments. 