import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { v2 as cloudinary } from "cloudinary";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "../../public/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter (images only)
const fileFilter = (req, file, cb) => {
  const allowedFileTypes = /jpeg|jpg|png|webp|gif/;
  const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedFileTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error("Error: Only images are allowed (jpeg, jpg, png, webp, gif)!"));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter,
});

/**
 * Uploads a local file to Cloudinary and deletes the local temporary file.
 * If Cloudinary is not configured, returns the local path as a fallback.
 * @param {string} localFilePath - Path to the local file
 * @param {string} folder - Folder name in Cloudinary
 * @returns {Promise<string>} The file URL (Cloudinary secure_url or local URL path)
 */
const uploadToCloudinary = async (localFilePath, folder = "stockflow") => {
  if (!localFilePath) return "";

  // Configure Cloudinary dynamically to avoid ES module loading issues
  const isCloudinaryConfigured = 
    process.env.CLOUDINARY_CLOUD_NAME && 
    process.env.CLOUDINARY_API_KEY && 
    process.env.CLOUDINARY_API_SECRET;

  if (isCloudinaryConfigured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  } else if (process.env.CLOUDINARY_URL) {
    cloudinary.config();
  }

  const filename = path.basename(localFilePath);
  const configured = isCloudinaryConfigured || process.env.CLOUDINARY_URL;

  if (!configured) {
    console.warn("Cloudinary URL is not configured in .env. Falling back to local upload.");
    return `/uploads/${filename}`;
  }

  try {
    const result = await cloudinary.uploader.upload(localFilePath, {
      folder: folder,
    });
    // Remove local file
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary upload failed:", error);
    // Cleanup local file anyway to avoid cluttering local disk
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    throw error;
  }
};

export { upload, uploadToCloudinary };
