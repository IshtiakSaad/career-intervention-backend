import { UploadApiResponse, v2 as cloudinary } from "cloudinary";
import { envVars } from "../config/env";
import fs from "fs";

// Configure Cloudinary
cloudinary.config({
  cloud_name: envVars.CLOUDINARY_CLOUD_NAME,
  api_key: envVars.CLOUDINARY_API_KEY,
  api_secret: envVars.CLOUDINARY_API_SECRET,
});

/**
 * Upload a file to Cloudinary from local storage
 * @param path Local file path
 * @returns Cloudinary upload result
 */
const uploadToCloudinary = async (path: string): Promise<UploadApiResponse | undefined> => {
  if (!fs.existsSync(path)) {
    throw new Error(`File not found at path: ${path}`);
  }

  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      path,

      { public_id: `career_app_${Date.now()}` },
      (error: any, result: any) => {
        // Delete file from local "uploads" folder after sending to cloud
        if (fs.existsSync(path)) {
          fs.unlinkSync(path);
        }

        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }

    );
  });
};

export const CloudinaryHelper = {
  uploadToCloudinary,
};

