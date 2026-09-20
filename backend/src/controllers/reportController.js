import mongoose from "mongoose";
import Inventory from "../models/Inventory.js";
import Order from "../models/Order.js";
import StockTransaction from "../models/StockTransaction.js";
import Product from "../models/Product.js";

// @desc    Get aggregated inventory report
// @route   GET /api/reports/inventory
// @access  Private (Admin, Manager)
export const getInventoryReport = async (req, res, next) => {
  try {
    const report = await Inventory.aggregate([
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $lookup: {
          from: "warehouses",
          localField: "warehouseId",
          foreignField: "_id",
          as: "warehouse",
        },
      },
      { $unwind: "$warehouse" },
      {
        $project: {
          _id: 0,
          Product: "$product.name",
          SKU: "$product.sku",
          Warehouse: "$warehouse.name",
          "Current Stock": "$quantity",
          Reserved: "$reserved",
          Available: { $subtract: ["$quantity", "$reserved"] },
          "Reorder Level": "$product.reorderLevel",
          "Stock Value": { $multiply: ["$quantity", "$product.costPrice"] },
        },
      },
    ]);

    res.json({ success: true, count: report.length, data: report });
  } catch (error) {
    next(error);
  }
};

// @desc    Get aggregated sales report
// @route   GET /api/reports/sales
// @access  Private (Admin, Manager)
export const getSalesReport = async (req, res, next) => {
  try {
    const report = await Order.aggregate([
      { $match: { type: "SALE" } },
      {
        $lookup: {
          from: "parties",
          localField: "party",
          foreignField: "_id",
          as: "partyDetails",
        },
      },
      { $unwind: "$partyDetails" },
      {
        $project: {
          _id: 0,
          Date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          Order: "$orderNumber",
          Customer: "$partyDetails.name",
          Products: { $size: "$items" },
          Quantity: { $sum: "$items.quantity" },
          Revenue: {
            $sum: {
              $map: {
                input: "$items",
                as: "item",
                in: { $multiply: ["$$item.quantity", "$$item.price"] },
              },
            },
          },
          Status: "$status",
        },
      },
      { $sort: { Date: -1 } },
    ]);

    res.json({ success: true, count: report.length, data: report });
  } catch (error) {
    next(error);
  }
};

// @desc    Get aggregated purchase report
// @route   GET /api/reports/purchase
// @access  Private (Admin, Manager)
export const getPurchaseReport = async (req, res, next) => {
  try {
    const report = await Order.aggregate([
      { $match: { type: "PURCHASE" } },
      {
        $lookup: {
          from: "parties",
          localField: "party",
          foreignField: "_id",
          as: "partyDetails",
        },
      },
      { $unwind: "$partyDetails" },
      {
        $project: {
          _id: 0,
          Date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          "PO Number": "$orderNumber",
          Supplier: "$partyDetails.name",
          Products: { $size: "$items" },
          Quantity: { $sum: "$items.quantity" },
          Amount: {
            $sum: {
              $map: {
                input: "$items",
                as: "item",
                in: { $multiply: ["$$item.quantity", "$$item.price"] },
              },
            },
          },
          Status: "$status",
        },
      },
      { $sort: { Date: -1 } },
    ]);

    res.json({ success: true, count: report.length, data: report });
  } catch (error) {
    next(error);
  }
};

// @desc    Get aggregated stock movement transaction report
// @route   GET /api/reports/movement
// @access  Private (Admin, Manager)
export const getMovementReport = async (req, res, next) => {
  try {
    const report = await StockTransaction.aggregate([
      {
        $lookup: {
          from: "products",
          localField: "product",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $lookup: {
          from: "warehouses",
          localField: "warehouse",
          foreignField: "_id",
          as: "warehouseDetails",
        },
      },
      { $unwind: "$warehouseDetails" },
      {
        $project: {
          _id: 0,
          Date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          Product: "$productDetails.name",
          Warehouse: "$warehouseDetails.name",
          Transaction: "$type",
          Quantity: "$quantity",
          Before: "$previousQuantity",
          After: "$newQuantity",
          User: "$performedBy",
        },
      },
      { $sort: { Date: -1 } },
    ]);

    res.json({ success: true, count: report.length, data: report });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dashboard metrics stats
// @route   GET /api/reports/dashboard-stats
// @access  Private
export const getDashboardStats = async (req, res, next) => {
  try {
    const productCount = await Product.countDocuments({});
    
    const inventory = await Inventory.find({}).populate("productId", "costPrice reorderLevel");
    let totalStock = 0;
    let inventoryValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const stockMap = {};
    inventory.forEach((i) => {
      if (i.productId) {
        const prodId = i.productId._id.toString();
        stockMap[prodId] = (stockMap[prodId] || 0) + i.quantity;
      }
    });

    const products = await Product.find({});
    products.forEach((p) => {
      const stock = stockMap[p._id.toString()] || 0;
      totalStock += stock;
      inventoryValue += stock * p.costPrice;

      if (stock === 0) {
        outOfStockCount++;
      } else if (stock <= p.reorderLevel) {
        lowStockCount++;
      }
    });

    const pendingPurchases = await Order.countDocuments({
      type: "PURCHASE",
      status: { $in: ["PENDING", "APPROVED"] },
    });

    const pendingSales = await Order.countDocuments({
      type: "SALE",
      status: "PENDING",
    });

    // Calculate Monthly Sales & Purchases (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo },
          status: { $nin: ["CANCELLED"] },
        },
      },
      {
        $project: {
          type: 1,
          month: { $dateToString: { format: "%b", date: "$createdAt" } },
          monthNum: { $month: "$createdAt" },
          year: { $year: "$createdAt" },
          total: {
            $sum: {
              $map: {
                input: "$items",
                as: "item",
                in: { $multiply: ["$$item.quantity", "$$item.price"] },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: { month: "$month", monthNum: "$monthNum", year: "$year", type: "$type" },
          totalAmount: { $sum: "$total" },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.monthNum": 1 },
      },
    ]);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const chartDataMap = {};

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mName = monthNames[d.getMonth()];
      chartDataMap[mName] = { month: mName, sales: 0, purchases: 0 };
    }

    monthlyStats.forEach((stat) => {
      const mName = stat._id.month;
      if (chartDataMap[mName]) {
        if (stat._id.type === "SALE") {
          chartDataMap[mName].sales = stat.totalAmount;
        } else if (stat._id.type === "PURCHASE") {
          chartDataMap[mName].purchases = stat.totalAmount;
        }
      }
    });

    const salesByMonth = Object.values(chartDataMap);

    res.json({
      success: true,
      data: {
        productCount,
        totalStock,
        lowStockCount,
        outOfStockCount,
        pendingPurchases,
        pendingSales,
        inventoryValue,
        salesByMonth,
      },
    });
  } catch (error) {
    next(error);
  }
};
