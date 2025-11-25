import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;

        // Upload file to Cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: 'auto', // Auto-detect (video, image, etc.)
        });

        // File uploaded successfully, remove local file
        fs.unlinkSync(localFilePath);
        return response;
    } catch (error) {
        // Remove local file if upload operation failed
        fs.unlinkSync(localFilePath);
        return null;
    }
};

export const deleteFromCloudinary = async (publicId, resourceType = 'video') => {
    try {
        await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch (error) {
        console.error("Error deleting from cloudinary:", error);
    }
}

export default cloudinary;
