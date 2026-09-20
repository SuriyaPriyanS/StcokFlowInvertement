import { Queue, Worker } from "bullmq";
import { getBullMQConnection } from "../config/bullmq.js";
import Product from "../models/Product.js";
import Inventory from "../models/Inventory.js";
import User from "../models/User.js";
import { addEmailToQueue } from "./emailService.js";

const connection = getBullMQConnection();

// Core logic: check low stock levels and notify
const checkLowStockAndAlert = async () => {
  try {
    console.log("Running low stock inventory checks...");
    const products = await Product.find({ status: "active" });
    const inventory = await Inventory.find({});
    
    // Group inventory by productId
    const stockMap = {};
    inventory.forEach((item) => {
      stockMap[item.productId.toString()] = (stockMap[item.productId.toString()] || 0) + item.quantity;
    });

    const lowStockItems = [];
    for (const p of products) {
      const currentStock = stockMap[p._id.toString()] || 0;
      if (currentStock <= p.reorderLevel) {
        lowStockItems.push({
          name: p.name,
          sku: p.sku,
          currentStock,
          reorderLevel: p.reorderLevel,
        });
      }
    }

    if (lowStockItems.length === 0) {
      console.log("Inventory levels are healthy. No alerts generated.");
      return;
    }

    // Get all admin and manager emails
    const usersToNotify = await User.find({
      role: { $in: ["Admin", "Manager"] },
      status: "active",
    });

    if (usersToNotify.length === 0) {
      console.log("No active Admin or Manager users found to notify.");
      return;
    }

    const emails = usersToNotify.map((u) => u.email);
    const emailHtml = `
      <h2>Low Stock Warning</h2>
      <p>The following items are at or below their reorder levels:</p>
      <table border="1" cellpadding="5" style="border-collapse: collapse;">
        <thead>
          <tr style="background-color: #f2f2f2;">
            <th>Product Name</th>
            <th>SKU</th>
            <th>Current Total Stock</th>
            <th>Reorder Level</th>
          </tr>
        </thead>
        <tbody>
          ${lowStockItems
            .map(
              (item) => `
            <tr>
              <td>${item.name}</td>
              <td><code>${item.sku}</code></td>
              <td style="color: red; font-weight: bold;">${item.currentStock}</td>
              <td>${item.reorderLevel}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
      <p>Please review and place replenishment orders.</p>
    `;

    for (const email of emails) {
      await addEmailToQueue(email, "StockFlow Alert: Low Inventory Warning", emailHtml);
    }
  } catch (error) {
    console.error("Error checking low stock levels:", error.message);
  }
};

// 1. Create Alert Queue
const alertQueue = new Queue("AlertQueue", { connection });

// 2. Setup repeatable cron job
const scheduleAlerts = async () => {
  try {
    const jobs = await alertQueue.getRepeatableJobs();
    for (const job of jobs) {
      await alertQueue.removeRepeatableByKey(job.key);
    }

    // Run every day at 8:00 AM (0 8 * * *)
    await alertQueue.add(
      "daily-low-stock-check",
      {},
      {
        repeat: {
          pattern: "0 8 * * *",
        },
      }
    );
    console.log("Scheduled low stock check cron: daily at 8:00 AM");
  } catch (error) {
    console.error("Failed to schedule alert cron job:", error.message);
  }
};

// 3. Create Worker
const alertWorker = new Worker(
  "AlertQueue",
  async (job) => {
    console.log(`Processing background inventory check job ${job.id}`);
    await checkLowStockAndAlert();
  },
  { connection }
);

export {
  checkLowStockAndAlert,
  scheduleAlerts,
  alertQueue,
  alertWorker,
};
