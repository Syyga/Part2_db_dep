import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export const uploadToCloudinary = async (
  buffer: Buffer,
  folder: string = "photo-cards"
): Promise<{ imageUrl: string; publicId: string }> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder }, (error, result) => {
        if (error || !result) return reject(error);
        resolve({
          imageUrl: result.secure_url,
          publicId: result.public_id,
        });
      })
      .end(buffer); // buffer를 직접 stream에 넣는다
  });
};
