import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadOnCloudinary = async (localFilePath, isVideo = false) => {
    try {
        if (!localFilePath) return null;

        const uploadOptions = {
            resource_type: isVideo ? 'video' : 'auto',
        };

        if (isVideo) {
            Object.assign(uploadOptions, {
                resource_type: 'video',
                // Removed eager transformation params to prevent upload timeouts
            });
        }

        const response = await cloudinary.uploader.upload(localFilePath, uploadOptions);

        fs.unlinkSync(localFilePath);

        if (isVideo) {
            response.hls_url = cloudinary.url(response.public_id, {
                resource_type: 'video',
                format: 'm3u8',
                secure: true
            });
        }

        return response;

    } catch (error) {
        console.error("Cloudinary upload error:", error.message);

        if (localFilePath && fs.existsSync(localFilePath)) {
            try { fs.unlinkSync(localFilePath); } catch (e) { }
        }

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
