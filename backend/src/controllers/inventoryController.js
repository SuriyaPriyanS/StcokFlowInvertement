import mongoose from "mongoose";
import Inventory from "../models/Inventory.js";
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import Warehouse from "../models/Warehouse.js";
import StockTransaction from "../models/StockTransaction.js";
import AuditLog from "../models/AuditLog.js";
import StockUpdateRequest from "../models/StockUpdateRequest.js";

// @desc    Get all inventory records
// @route   GET /api/inventory
// @access  Private
export const getInventory = async (req, res, next) => {
  try {
    const { warehouseId } = req.query;
    const filter = {};
    if (warehouseId) {
      filter.warehouseId = warehouseId;
    }

    const inventory = await Inventory.find(filter)
      .populate("productId", "name sku barcode category brand costPrice sellingPrice reorderLevel status")
      .populate("warehouseId", "name location status");

    res.json({ success: true, count: inventory.length, data: inventory });
  } catch (error) {
    next(error);
  }
};

// @desc    Perform a manual stock adjustment / Create Stock Update Request
// @route   POST /api/inventory/adjust
// @access  Private (Admin, Manager, Inventory Staff)
export const adjustStock = async (req, res, next) => {
  try {
    const { productId, warehouseId, qty, reason, type } = req.body;

    if (!productId || !warehouseId || !qty || !type) {
      return res.status(400).json({ success: false, message: "Please provide target product, warehouse, adjustment quantity and type" });
    }

    const finalReason = (reason && reason.trim()) || `Stock ${type === "ADJUSTMENT_OUT" ? "outward" : "inward"} added by ${req.user?.name || "Store Manager"}`;

    if (!["ADJUSTMENT_IN", "ADJUSTMENT_OUT"].includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid adjustment type" });
    }

    const adjustmentQty = Math.abs(parseInt(qty, 10));
    if (isNaN(adjustmentQty) || adjustmentQty <= 0) {
      return res.status(400).json({ success: false, message: "Quantity must be a positive integer" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) {
      return res.status(404).json({ success: false, message: "Warehouse not found" });
    }

    const currentInv = await Inventory.findOne({ productId, warehouseId });
    const currentQty = currentInv ? currentInv.quantity : 0;

    // Check if user is Store Manager (non-Admin) -> Submit as PENDING approval request
    const isAdmin = req.user?.role === "Admin";

    if (!isAdmin) {
      const title = `Stock ${type === "ADJUSTMENT_OUT" ? "Outward" : "Inward"} (${adjustmentQty} units for ${product.name})`;
      const updateRequest = await StockUpdateRequest.create({
        title,
        requestType: "MANUAL_ADJUSTMENT",
        submittedBy: req.user._id,
        submittedByName: req.user.name,
        submittedByRole: req.user.role,
        status: "PENDING",
        items: [
          {
            productId: product._id,
            productName: product.name,
            sku: product.sku,
            warehouseId: warehouse._id,
            warehouseName: warehouse.name,
            quantity: adjustmentQty,
            type,
            previousQuantity: currentQty,
            reason: finalReason,
          },
        ],
        totalItemsCount: 1,
        totalQuantity: adjustmentQty,
        notes: finalReason,
      });

      await AuditLog.create({
        action: "STOCK_UPDATE_REQUEST_SUBMITTED",
        detail: `Store Manager ${req.user.name} submitted stock request for ${product.name} (${adjustmentQty} units) pending Admin approval`,
        performedBy: req.user.name,
      });

      return res.status(201).json({
        success: true,
        pendingApproval: true,
        message: "Stock update request submitted successfully. It is currently PENDING Admin approval.",
        data: updateRequest,
      });
    }

    // Direct Admin Execution
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      let inventory = await Inventory.findOne({ productId, warehouseId }).session(session);
      if (!inventory) {
        inventory = new Inventory({
          productId,
          warehouseId,
          quantity: 0,
          reserved: 0,
        });
      }

      const prevQty = inventory.quantity;
      const delta = type === "ADJUSTMENT_OUT" ? -adjustmentQty : adjustmentQty;
      const newQty = prevQty + delta;

      if (newQty < 0) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for adjustment. Current stock: ${prevQty}, requested reduction: ${adjustmentQty}`,
        });
      }

      inventory.quantity = newQty;
      await inventory.save({ session });

      const transaction = await StockTransaction.create(
        [
          {
            product: productId,
            warehouse: warehouseId,
            type,
            quantity: adjustmentQty,
            previousQuantity: prevQty,
            newQuantity: newQty,
            reason: finalReason,
            performedBy: req.user.name,
          },
        ],
        { session }
      );

      await AuditLog.create(
        [
          {
            action: "STOCK_ADJUSTMENT",
            detail: `Stock adjusted for product ${product.sku} at warehouse ${warehouse.name}: ${type} ${adjustmentQty} (Reason: ${finalReason})`,
            performedBy: req.user.name,
          },
        ],
        { session }
      );

      // Also create an APPROVED record for complete history
      await StockUpdateRequest.create(
        [
          {
            title: `Admin Direct Stock ${type === "ADJUSTMENT_OUT" ? "Outward" : "Inward"} (${adjustmentQty} units - ${product.name})`,
            requestType: "MANUAL_ADJUSTMENT",
            submittedBy: req.user._id,
            submittedByName: req.user.name,
            submittedByRole: req.user.role,
            status: "APPROVED",
            items: [
              {
                productId: product._id,
                productName: product.name,
                sku: product.sku,
                warehouseId: warehouse._id,
                warehouseName: warehouse.name,
                quantity: adjustmentQty,
                type,
                previousQuantity: prevQty,
                reason: finalReason,
              },
            ],
            totalItemsCount: 1,
            totalQuantity: adjustmentQty,
            notes: finalReason,
            reviewedBy: req.user._id,
            reviewedByName: req.user.name,
            reviewedAt: new Date(),
          },
        ],
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      res.json({
        success: true,
        pendingApproval: false,
        message: "Stock updated successfully in inventory",
        data: {
          inventoryId: inventory._id,
          productId,
          warehouseId,
          previousQuantity: prevQty,
          newQuantity: newQty,
          transaction: transaction[0],
        },
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Batch import stock updates from Excel
// @route   POST /api/inventory/import
// @access  Private (Admin, Manager, Inventory Staff)
export const importStockBatch = async (req, res, next) => {
  try {
    const { items, title, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "No items provided in import batch" });
    }

    const allProducts = await Product.find({});
    const allWarehouses = await Warehouse.find({});

    const productBySku = new Map(allProducts.map((p) => [(p.sku || "").toLowerCase().trim(), p]));
    const productByName = new Map(allProducts.map((p) => [(p.name || "").toLowerCase().trim(), p]));
    const warehouseById = new Map(allWarehouses.map((w) => [w._id.toString(), w]));
    const warehouseByName = new Map(allWarehouses.map((w) => [(w.name || "").toLowerCase().trim(), w]));

    const validItems = [];
    const errors = [];
    let totalQty = 0;

    for (let index = 0; index < items.length; index++) {
      const row = items[index];
      const rowNum = index + 1;

      const cleanSku = String(row.sku || row.productCode || "").trim();
      const cleanName = String(row.productName || row.name || cleanSku).trim();
      const cleanCategoryName = String(row.category || "General").trim();
      const cleanHsn = String(row.hsnCode || row.barcode || "").trim();
      const cleanWarehouseName = String(row.warehouseName || row.location || "Theni").trim();

      if (!cleanName && !cleanSku) {
        errors.push({ row: rowNum, message: "Missing SKU and Product Name" });
        continue;
      }

      // 1. Match or Auto-create Product
      let product = null;
      if (cleanSku && productBySku.has(cleanSku.toLowerCase())) {
        product = productBySku.get(cleanSku.toLowerCase());
      } else if (cleanName && productByName.has(cleanName.toLowerCase())) {
        product = productByName.get(cleanName.toLowerCase());
      } else if (row.productId) {
        product = allProducts.find((p) => p._id.toString() === String(row.productId));
      }

      if (!product) {
        // Find or create Category
        let category = await Category.findOne({ name: new RegExp(`^${cleanCategoryName}$`, "i") });
        if (!category) {
          category = await Category.create({ name: cleanCategoryName });
        }

        const generatedSku = cleanSku || `SKU-${cleanName.replace(/[^A-Za-z0-9]/g, "").substring(0, 8).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        try {
          product = await Product.create({
            name: cleanName || cleanSku,
            sku: generatedSku,
            barcode: cleanHsn,
            category: category._id,
            brand: row.brand || "Standard",
            costPrice: Number(row.costPrice) || Number(row.price) || 0,
            sellingPrice: Number(row.sellingPrice) || Number(row.price) || 0,
            unit: "piece",
            minimumStock: 0,
            maximumStock: 1000,
            reorderLevel: 5,
            status: "active",
          });

          productBySku.set(product.sku.toLowerCase(), product);
          productByName.set(product.name.toLowerCase(), product);
          allProducts.push(product);
        } catch (createErr) {
          // If duplicate SKU, try to fetch existing
          product = await Product.findOne({ sku: generatedSku });
          if (!product) {
            errors.push({ row: rowNum, message: `Could not create product: ${createErr.message}` });
            continue;
          }
        }
      }

      // 2. Match or Auto-create Warehouse
      let warehouse = null;
      if (row.warehouseId && warehouseById.has(String(row.warehouseId))) {
        warehouse = warehouseById.get(String(row.warehouseId));
      } else if (cleanWarehouseName && warehouseByName.has(cleanWarehouseName.toLowerCase())) {
        warehouse = warehouseByName.get(cleanWarehouseName.toLowerCase());
      } else if (cleanWarehouseName) {
        warehouse = await Warehouse.findOne({ name: new RegExp(`^${cleanWarehouseName}$`, "i") });
        if (!warehouse) {
          warehouse = await Warehouse.create({
            name: cleanWarehouseName,
            location: cleanWarehouseName,
            status: "active",
          });
        }
        warehouseById.set(warehouse._id.toString(), warehouse);
        warehouseByName.set(warehouse.name.toLowerCase(), warehouse);
        allWarehouses.push(warehouse);
      } else if (allWarehouses.length > 0) {
        warehouse = allWarehouses[0];
      }

      if (!warehouse) {
        errors.push({ row: rowNum, message: `Warehouse could not be resolved for row: "${cleanWarehouseName || 'N/A'}"` });
        continue;
      }

      const qty = Math.abs(parseInt(row.quantity, 10));
      if (isNaN(qty) || qty <= 0) {
        errors.push({ row: rowNum, message: `Invalid quantity "${row.quantity}" for Product ${product.name}` });
        continue;
      }

      const type = (row.type || "ADJUSTMENT_IN").toUpperCase() === "ADJUSTMENT_OUT" ? "ADJUSTMENT_OUT" : "ADJUSTMENT_IN";
      const reason = row.reason || "Excel Batch Import";
      totalQty += qty;

      validItems.push({
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        category: cleanCategoryName,
        hsnCode: cleanHsn,
        warehouseId: warehouse._id,
        warehouseName: warehouse.name,
        quantity: qty,
        type,
        costPrice: product.costPrice || 0,
        sellingPrice: product.sellingPrice || 0,
        reason,
      });
    }

    if (validItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid rows could be parsed from the Excel file.",
        errors,
      });
    }

    const isAdmin = req.user?.role === "Admin";
    const batchTitle = title || `Excel Stock Batch Import (${validItems.length} items by ${req.user.name})`;

    // If Store Manager (non-Admin) -> Create PENDING approval request
    if (!isAdmin) {
      const updateRequest = await StockUpdateRequest.create({
        title: batchTitle,
        requestType: "EXCEL_IMPORT",
        submittedBy: req.user._id,
        submittedByName: req.user.name,
        submittedByRole: req.user.role,
        status: "PENDING",
        items: validItems,
        totalItemsCount: validItems.length,
        totalQuantity: totalQty,
        notes: notes || `Excel file imported with ${validItems.length} items`,
      });

      await AuditLog.create({
        action: "EXCEL_IMPORT_REQUEST_SUBMITTED",
        detail: `Store Manager ${req.user.name} submitted Excel batch of ${validItems.length} items pending Admin approval`,
        performedBy: req.user.name,
      });

      return res.status(201).json({
        success: true,
        pendingApproval: true,
        importedCount: validItems.length,
        errorCount: errors.length,
        message: `Excel sheet parsed successfully with ${validItems.length} items. Request is PENDING Admin approval in Admin Portal.`,
        data: updateRequest,
        errors,
      });
    }

    // Direct Admin Execution
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const results = [];

      for (const item of validItems) {
        let inventory = await Inventory.findOne({ productId: item.productId, warehouseId: item.warehouseId }).session(session);
        if (!inventory) {
          inventory = new Inventory({
            productId: item.productId,
            warehouseId: item.warehouseId,
            quantity: 0,
            reserved: 0,
          });
        }

        const prevQty = inventory.quantity;
        const delta = item.type === "ADJUSTMENT_OUT" ? -item.quantity : item.quantity;
        const newQty = Math.max(0, prevQty + delta);

        inventory.quantity = newQty;
        await inventory.save({ session });

        await StockTransaction.create(
          [
            {
              product: item.productId,
              warehouse: item.warehouseId,
              type: item.type,
              quantity: item.quantity,
              previousQuantity: prevQty,
              newQuantity: newQty,
              reason: item.reason,
              performedBy: req.user.name,
            },
          ],
          { session }
        );

        results.push({
          sku: item.sku,
          productName: item.productName,
          warehouseName: item.warehouseName,
          previousQuantity: prevQty,
          newQuantity: newQty,
          type: item.type,
        });
      }

      await AuditLog.create(
        [
          {
            action: "EXCEL_STOCK_IMPORT",
            detail: `Admin ${req.user.name} imported and applied ${results.length} stock adjustments from Excel`,
            performedBy: req.user.name,
          },
        ],
        { session }
      );

      await StockUpdateRequest.create(
        [
          {
            title: batchTitle,
            requestType: "EXCEL_IMPORT",
            submittedBy: req.user._id,
            submittedByName: req.user.name,
            submittedByRole: req.user.role,
            status: "APPROVED",
            items: validItems,
            totalItemsCount: validItems.length,
            totalQuantity: totalQty,
            notes: notes || "Direct Admin Excel Import",
            reviewedBy: req.user._id,
            reviewedByName: req.user.name,
            reviewedAt: new Date(),
          },
        ],
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      res.json({
        success: true,
        pendingApproval: false,
        importedCount: results.length,
        errorCount: errors.length,
        data: results,
        errors,
        message: `Successfully updated ${results.length} inventory records from Excel file.`,
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get all Stock Update Requests (with status filter)
// @route   GET /api/inventory/requests
// @access  Private (Admin, Manager, Inventory Staff)
export const getStockUpdateRequests = async (req, res, next) => {
  try {
    const { status, requestType } = req.query;
    const filter = {};

    if (status && status !== "ALL") {
      filter.status = status;
    }

    if (requestType) {
      filter.requestType = requestType;
    }

    // Non-admins only see their own requests (or all if manager)
    if (req.user.role === "Inventory Staff") {
      filter.submittedBy = req.user._id;
    }

    const requests = await StockUpdateRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate("submittedBy", "name email role")
      .populate("reviewedBy", "name email role");

    res.json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve a Stock Update Request (Admin only)
// @route   PUT /api/inventory/requests/:id/approve
// @access  Private (Admin)
export const approveStockUpdateRequest = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const updateRequest = await StockUpdateRequest.findById(id).session(session);

    if (!updateRequest) {
      return res.status(404).json({ success: false, message: "Stock update request not found" });
    }

    if (updateRequest.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: `Request cannot be approved because its current status is "${updateRequest.status}"`,
      });
    }

    // Apply all items to inventory
    for (const item of updateRequest.items) {
      let inventory = await Inventory.findOne({ productId: item.productId, warehouseId: item.warehouseId }).session(session);
      if (!inventory) {
        inventory = new Inventory({
          productId: item.productId,
          warehouseId: item.warehouseId,
          quantity: 0,
          reserved: 0,
        });
      }

      const prevQty = inventory.quantity;
      const delta = item.type === "ADJUSTMENT_OUT" ? -item.quantity : item.quantity;
      const newQty = Math.max(0, prevQty + delta);

      inventory.quantity = newQty;
      await inventory.save({ session });

      await StockTransaction.create(
        [
          {
            product: item.productId,
            warehouse: item.warehouseId,
            type: item.type,
            quantity: item.quantity,
            previousQuantity: prevQty,
            newQuantity: newQty,
            reason: item.reason || `Approved request: ${updateRequest.title}`,
            performedBy: `${req.user.name} (Approved for ${updateRequest.submittedByName})`,
            referenceId: updateRequest._id.toString(),
          },
        ],
        { session }
      );
    }

    updateRequest.status = "APPROVED";
    updateRequest.reviewedBy = req.user._id;
    updateRequest.reviewedByName = req.user.name;
    updateRequest.reviewedAt = new Date();
    await updateRequest.save({ session });

    await AuditLog.create(
      [
        {
          action: "STOCK_UPDATE_APPROVED",
          detail: `Admin ${req.user.name} approved stock request "${updateRequest.title}" submitted by ${updateRequest.submittedByName} (${updateRequest.items.length} items updated)`,
          performedBy: req.user.name,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: `Stock update request approved successfully! ${updateRequest.items.length} items updated in inventory.`,
      data: updateRequest,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

// @desc    Reject a Stock Update Request (Admin only)
// @route   PUT /api/inventory/requests/:id/reject
// @access  Private (Admin)
export const rejectStockUpdateRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    const updateRequest = await StockUpdateRequest.findById(id);

    if (!updateRequest) {
      return res.status(404).json({ success: false, message: "Stock update request not found" });
    }

    if (updateRequest.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: `Request cannot be rejected because its current status is "${updateRequest.status}"`,
      });
    }

    updateRequest.status = "REJECTED";
    updateRequest.rejectionReason = rejectionReason || "Rejected by Admin";
    updateRequest.reviewedBy = req.user._id;
    updateRequest.reviewedByName = req.user.name;
    updateRequest.reviewedAt = new Date();
    await updateRequest.save();

    await AuditLog.create({
      action: "STOCK_UPDATE_REJECTED",
      detail: `Admin ${req.user.name} rejected stock request "${updateRequest.title}" submitted by ${updateRequest.submittedByName} (Reason: ${updateRequest.rejectionReason})`,
      performedBy: req.user.name,
    });

    res.json({
      success: true,
      message: "Stock update request has been rejected.",
      data: updateRequest,
    });
  } catch (error) {
    next(error);
  }
};
