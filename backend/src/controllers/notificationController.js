import Notification from "../models/Notification.js";
import Product from "../models/Product.js";
import Inventory from "../models/Inventory.js";
import StockUpdateRequest from "../models/StockUpdateRequest.js";

// @desc    Get live real-time notifications and low-stock alerts
// @route   GET /api/notifications
// @access  Private
export const getNotifications = async (req, res, next) => {
  try {
    const user = req.user;

    // 1. Live scan products and inventory for low-stock and out-of-stock items
    const [products, inventory, pendingRequests] = await Promise.all([
      Product.find({ status: "active" }),
      Inventory.find({}).populate("warehouseId", "name location"),
      StockUpdateRequest.find({ status: "PENDING" }),
    ]);

    // Map inventory quantities by product
    const stockByProduct = {};
    const stockByProductWh = {};

    inventory.forEach((i) => {
      const pId = i.productId ? i.productId.toString() : null;
      if (pId) {
        stockByProduct[pId] = (stockByProduct[pId] || 0) + i.quantity;

        const whName = i.warehouseId?.name || "Main Warehouse";
        if (!stockByProductWh[pId]) stockByProductWh[pId] = [];
        stockByProductWh[pId].push({
          warehouseId: i.warehouseId?._id,
          warehouseName: whName,
          quantity: i.quantity,
          available: i.quantity - (i.reserved || 0),
        });
      }
    });

    // Generate real-time live notifications array
    const liveNotifications = [];

    // Check for Low Stock / Out of Stock
    products.forEach((p) => {
      const pId = p._id.toString();
      const currentStock = stockByProduct[pId] || 0;
      const reorderLevel = p.reorderLevel || 0;

      if (currentStock === 0) {
        liveNotifications.push({
          _id: `out-of-stock-${pId}`,
          type: "OUT_OF_STOCK",
          severity: "critical",
          title: `Out of Stock: ${p.name}`,
          message: `Product ${p.name} (SKU: ${p.sku}) has 0 units remaining. Reorder threshold is ${reorderLevel}.`,
          productId: p._id,
          productName: p.name,
          sku: p.sku,
          currentStock: 0,
          reorderLevel,
          suggestedReorderQty: Math.max((p.maximumStock || 50) - currentStock, 20),
          link: "/inventory",
          targetRoles: ["Admin", "Manager", "Inventory Staff"],
          createdAt: p.updatedAt || new Date(),
        });
      } else if (currentStock <= reorderLevel) {
        liveNotifications.push({
          _id: `low-stock-${pId}`,
          type: "LOW_STOCK",
          severity: "warning",
          title: `Low Stock Warning: ${p.name}`,
          message: `Product ${p.name} (SKU: ${p.sku}) is at ${currentStock} units (Threshold: ${reorderLevel}).`,
          productId: p._id,
          productName: p.name,
          sku: p.sku,
          currentStock,
          reorderLevel,
          suggestedReorderQty: Math.max((p.maximumStock || 50) - currentStock, 15),
          link: "/inventory",
          targetRoles: ["Admin", "Manager", "Inventory Staff"],
          createdAt: p.updatedAt || new Date(),
        });
      }
    });

    // Check for Pending Stock Update Approvals (for Admin)
    if (user.role === "Admin") {
      pendingRequests.forEach((req) => {
        liveNotifications.push({
          _id: `pending-request-${req._id}`,
          type: "STOCK_REQUEST_PENDING",
          severity: "warning",
          title: `Pending Stock Approval: ${req.title}`,
          message: `Submitted by ${req.submittedByName} (${req.submittedByRole}) with ${req.totalQuantity} units across ${req.totalItemsCount} items.`,
          requestId: req._id,
          link: "/settings",
          targetRoles: ["Admin"],
          createdAt: req.createdAt,
        });
      });
    }

    // Filter by user role
    const filteredNotifications = liveNotifications.filter((n) =>
      n.targetRoles.includes(user.role)
    );

    // Sort by severity: critical > warning > info, then newest first
    const severityWeight = { critical: 3, warning: 2, info: 1 };
    filteredNotifications.sort((a, b) => {
      const weightDiff = (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0);
      if (weightDiff !== 0) return weightDiff;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // Retrieve dismissed IDs stored in DB or session
    const dbNotifications = await Notification.find({
      readBy: user._id,
    }).select("_id");
    const readIds = new Set(dbNotifications.map((n) => n._id.toString()));

    const unreadCount = filteredNotifications.filter((n) => !readIds.has(n._id)).length;

    res.json({
      success: true,
      unreadCount,
      count: filteredNotifications.length,
      data: filteredNotifications,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark a notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markNotificationAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    let notif = await Notification.findById(id);
    if (!notif) {
      // Create record if it was generated dynamically
      notif = new Notification({
        _id: mongoose.Types.ObjectId.isValid(id) ? id : new mongoose.Types.ObjectId(),
        title: "Notification Read",
        message: "Read marker",
        readBy: [userId],
      });
    } else {
      if (!notif.readBy.includes(userId)) {
        notif.readBy.push(userId);
      }
    }

    await notif.save();

    res.json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
export const markAllNotificationsAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Add user to readBy for all existing notifications
    await Notification.updateMany(
      { readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } }
    );

    res.json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed low-stock replenishment report
// @route   GET /api/notifications/low-stock-summary
// @access  Private
export const getLowStockSummary = async (req, res, next) => {
  try {
    const products = await Product.find({ status: "active" }).populate("category", "name");
    const inventory = await Inventory.find({}).populate("warehouseId", "name location");

    const stockMap = {};
    inventory.forEach((i) => {
      const pId = i.productId ? i.productId.toString() : null;
      if (pId) {
        stockMap[pId] = (stockMap[pId] || 0) + i.quantity;
      }
    });

    const lowStockItems = [];
    let outOfStockCount = 0;
    let lowStockCount = 0;
    let healthyCount = 0;

    products.forEach((p) => {
      const currentStock = stockMap[p._id.toString()] || 0;
      const reorderLevel = p.reorderLevel || 0;
      const maxStock = p.maximumStock || 50;

      if (currentStock === 0) {
        outOfStockCount++;
        lowStockItems.push({
          product: p,
          currentStock: 0,
          reorderLevel,
          maxStock,
          deficit: maxStock - currentStock,
          suggestedReorder: Math.max(maxStock - currentStock, 25),
          status: "OUT_OF_STOCK",
        });
      } else if (currentStock <= reorderLevel) {
        lowStockCount++;
        lowStockItems.push({
          product: p,
          currentStock,
          reorderLevel,
          maxStock,
          deficit: maxStock - currentStock,
          suggestedReorder: Math.max(maxStock - currentStock, 15),
          status: "LOW_STOCK",
        });
      } else {
        healthyCount++;
      }
    });

    res.json({
      success: true,
      summary: {
        totalProducts: products.length,
        outOfStockCount,
        lowStockCount,
        healthyCount,
      },
      items: lowStockItems,
    });
  } catch (error) {
    next(error);
  }
};
