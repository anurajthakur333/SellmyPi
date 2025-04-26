// backend/server.js

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import transactionRoutes from './routes/transactionRoutes.js';
import userRoutes from './routes/userRoutes.js';
import cloudinaryRoutes from './routes/cloudinaryRoutes.js';

// Load environment variables
dotenv.config();

// Ensure required environment variables are set
if (!process.env.CLERK_SECRET_KEY) {
  console.error('CLERK_SECRET_KEY is required but not set in environment variables');
  process.exit(1);
}

// Check for Cloudinary environment variables
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('Cloudinary environment variables are required but not set');
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

const app = express();
connectDB();

app.use(cors());
app.use(express.json());

// Protect admin routes
app.use('/api/users', ClerkExpressRequireAuth(), userRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/cloudinary', ClerkExpressRequireAuth(), cloudinaryRoutes); // Protect Cloudinary routes

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
