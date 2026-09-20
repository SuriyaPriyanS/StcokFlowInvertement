import express from "express";
import { upload, uploadToCloudinary } from "../services/uploadService.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// @desc    Upload an image to Cloudinary
// @route   POST /api/upload
// @access  Private
router.post("/", protect, upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const imageUrl = await uploadToCloudinary(req.file.path, "general");
    
    res.status(200).json({
      success: true,
      url: imageUrl,
      name: req.file.originalname,
      size: req.file.size,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
