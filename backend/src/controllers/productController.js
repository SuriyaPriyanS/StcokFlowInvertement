import mongoose from "mongoose";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import AuditLog from "../models/AuditLog.js";
import Inventory from "../models/Inventory.js";
import { redisClient } from "../config/redis.js";
import { uploadToCloudinary } from "../services/uploadService.js";

const CACHE_KEY_ALL = "products:all";
const CACHE_EXPIRY = 3600;

const clearProductCache = async (productId = null) => {
  try {
    await redisClient.del(CACHE_KEY_ALL);
    if (productId) {
      await redisClient.del(`product:${productId}`);
    }
    console.log("Product Redis cache invalidated");
  } catch (error) {
    console.error("Redis cache invalidation failed:", error.message);
  }
};

// @desc    Get all products
// @route   GET /api/products
// @access  Private
export const getProducts = async (req, res, next) => {
  try {
    const { category, search } = req.query;
    const hasQuery = category || search;
    
    if (!hasQuery) {
      try {
        const cachedProducts = await redisClient.get(CACHE_KEY_ALL);
        if (cachedProducts) {
          console.log("Serving products list from Redis cache");
          return res.json({
            success: true,
            cached: true,
            data: JSON.parse(cachedProducts),
          });
        }
      } catch (redisError) {
        console.error("Redis GET failed, falling back to DB:", redisError.message);
      }
    }

    const query = {};
    if (category) {
      query.category = category;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
      ];
    }

    const products = await Product.find(query).populate("category", "name");

    if (!hasQuery) {
      try {
        await redisClient.set(CACHE_KEY_ALL, JSON.stringify(products), {
          EX: CACHE_EXPIRY,
        });
        console.log("Products list cached in Redis");
      } catch (redisError) {
        console.error("Redis SET failed:", redisError.message);
      }
    }

    res.json({ success: true, count: products.length, data: products });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Private
export const getProductById = async (req, res, next) => {
  try {
    const cacheKey = `product:${req.params.id}`;
    
    try {
      const cachedProduct = await redisClient.get(cacheKey);
      if (cachedProduct) {
        console.log(`Serving product ${req.params.id} from Redis cache`);
        return res.json({
          success: true,
          cached: true,
          data: JSON.parse(cachedProduct),
        });
      }
    } catch (redisError) {
      console.error("Redis GET failed for product, falling back to DB:", redisError.message);
    }

    const product = await Product.findById(req.params.id).populate("category", "name");
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    try {
      await redisClient.set(cacheKey, JSON.stringify(product), {
        EX: CACHE_EXPIRY,
      });
      console.log(`Product ${req.params.id} cached in Redis`);
    } catch (redisError) {
      console.error("Redis SET failed for product:", redisError.message);
    }

    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private (Admin, Manager)
export const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      sku,
      barcode,
      category,
      brand,
      costPrice,
      sellingPrice,
      tax,
      unit,
      minimumStock,
      maximumStock,
      reorderLevel,
    } = req.body;

    const skuExists = await Product.findOne({ sku });
    if (skuExists) {
      return res.status(400).json({ success: false, message: "Product SKU already exists" });
    }

    if (!category || category === "") {
      return res.status(400).json({ success: false, message: "Category is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({ success: false, message: "Invalid Category ID format" });
    }

    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({ success: false, message: "Selected category does not exist" });
    }

    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      imageUrls = await Promise.all(
        req.files.map((file) => uploadToCloudinary(file.path, "products"))
      );
    }
    const primaryImageUrl = imageUrls[0] || "";

    const product = await Product.create({
      name,
      sku,
      barcode,
      category,
      brand,
      costPrice: parseFloat(costPrice) || 0,
      sellingPrice: parseFloat(sellingPrice) || 0,
      tax: parseFloat(tax) || 18,
      unit,
      minimumStock: parseInt(minimumStock, 10) || 0,
      maximumStock: parseInt(maximumStock, 10) || 0,
      reorderLevel: parseInt(reorderLevel, 10) || 0,
      imageUrl: primaryImageUrl,
      imageUrls: imageUrls,
    });

    await clearProductCache();

    await AuditLog.create({
      action: "PRODUCT_CREATED",
      detail: `Product ${product.name} (${product.sku}) created`,
      performedBy: req.user.name,
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private (Admin, Manager)
export const updateProduct = async (req, res, next) => {
  try {
    const {
      name,
      sku,
      barcode,
      category,
      brand,
      costPrice,
      sellingPrice,
      tax,
      unit,
      minimumStock,
      maximumStock,
      reorderLevel,
      status,
      imageUrl,
    } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (category !== undefined) {
      if (!category || category === "") {
        return res.status(400).json({ success: false, message: "Category is required" });
      }

      if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({ success: false, message: "Invalid Category ID format" });
      }

      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(400).json({ success: false, message: "Selected category does not exist" });
      }
    }

    if (sku && sku !== product.sku) {
      const skuExists = await Product.findOne({ sku });
      if (skuExists) {
        return res.status(400).json({ success: false, message: "Product SKU already exists" });
      }
      product.sku = sku;
    }

    product.name = name || product.name;
    product.barcode = barcode !== undefined ? barcode : product.barcode;
    product.category = category || product.category;
    product.brand = brand !== undefined ? brand : product.brand;
    product.costPrice = costPrice !== undefined ? parseFloat(costPrice) : product.costPrice;
    product.sellingPrice = sellingPrice !== undefined ? parseFloat(sellingPrice) : product.sellingPrice;
    product.tax = tax !== undefined ? parseFloat(tax) : product.tax;
    product.unit = unit || product.unit;
    product.minimumStock = minimumStock !== undefined ? parseInt(minimumStock, 10) : product.minimumStock;
    product.maximumStock = maximumStock !== undefined ? parseInt(maximumStock, 10) : product.maximumStock;
    product.reorderLevel = reorderLevel !== undefined ? parseInt(reorderLevel, 10) : product.reorderLevel;
    product.status = status || product.status;

    let existingUrls = [];
    if (req.body.imageUrls) {
      try {
        existingUrls = JSON.parse(req.body.imageUrls);
      } catch (e) {
        existingUrls = Array.isArray(req.body.imageUrls) ? req.body.imageUrls : [req.body.imageUrls];
      }
    } else if (imageUrl === "") {
      // If imageUrl was cleared explicitly
      existingUrls = [];
    } else {
      // Retain existing urls if not specified
      existingUrls = product.imageUrls || [];
    }

    let newImageUrls = [];
    if (req.files && req.files.length > 0) {
      newImageUrls = await Promise.all(
        req.files.map((file) => uploadToCloudinary(file.path, "products"))
      );
    }

    const mergedUrls = [...existingUrls, ...newImageUrls];
    product.imageUrls = mergedUrls;
    product.imageUrl = mergedUrls[0] || "";

    await product.save();

    await clearProductCache(product._id);

    await AuditLog.create({
      action: "PRODUCT_UPDATED",
      detail: `Product ${product.name} (${product.sku}) updated`,
      performedBy: req.user.name,
    });

    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private (Admin)
export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const hasInventory = await Inventory.findOne({ productId: req.params.id, quantity: { $gt: 0 } });
    if (hasInventory) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete product with active stock. Complete or adjust stock first.",
      });
    }

    await Inventory.deleteMany({ productId: req.params.id });

    const productName = product.name;
    const productSku = product.sku;

    await product.deleteOne();

    await clearProductCache(req.params.id);

    await AuditLog.create({
      action: "PRODUCT_DELETED",
      detail: `Product ${productName} (${productSku}) deleted`,
      performedBy: req.user.name,
    });

    res.json({ success: true, message: "Product removed" });
  } catch (error) {
    next(error);
  }
};
