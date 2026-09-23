import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load env variables FIRST before any other imports that may need them
dotenv.config();

import connectDB from "./config/db.js";
import { connectRedis } from "./config/redis.js";
import { scheduleAlerts } from "./services/alertService.js";
import errorHandler from "./middleware/error.js";

// Import Routes
import authRoutes from "./routes/authRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import warehouseRoutes from "./routes/warehouseRoutes.js";
import partyRoutes from "./routes/partyRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import transferRoutes from "./routes/transferRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import branchRoutes from "./routes/branchRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ─── CORS — must be the very first middleware ──────────────────────────────────
// Allow local dev and any Vercel deployment for this project or its aliases.
// This avoids blocked login calls after frontend redeploys when Vercel changes the
// generated project URL or preview alias.
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  /^https:\/\/.*\.vercel\.app$/,
  /^https:\/\/.*--.*\.vercel\.app$/,
  /^https:\/\/stcok-flow-invertement.*\.vercel\.app$/,
  "https://stcok-flow-invertement.vercel.app",
  "https://stcok-flow-invertement-git-master-suriya2.vercel.app",
  "https://stcok-flow-invertement-udsj-git-master-suriya2.vercel.app",
  "https://stcok-flow-invertement-udsj.vercel.app",
];

app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Check if origin matches any allowed pattern
  const isAllowed =
    !origin || // allow server-to-server (no origin header)
    ALLOWED_ORIGINS.some((allowed) =>
      allowed instanceof RegExp ? allowed.test(origin) : allowed === origin
    );

  if (isAllowed && origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  } else if (!origin) {
    // Non-browser request (curl, Postman, server-to-server)
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    req.headers["access-control-request-headers"] || "Content-Type, Authorization, X-Requested-With, Accept"
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Preflight: respond immediately with 200 — do NOT touch MongoDB
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  next();
});

app.use(express.json());


// Serve static uploaded files
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));

// Vercel serverless: connect MongoDB lazily BEFORE routes are hit
let isConnected = false;
app.use(async (req, res, next) => {
  if (!isConnected) {
    try {
      await connectDB();
      isConnected = true;
    } catch (error) {
      console.error("MongoDB connection failed:", error.message);
      return res.status(500).json({ error: "Database connection failed" });
    }
  }
  next();
});

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/warehouses", warehouseRoutes);
app.use("/api/parties", partyRoutes);
app.use("/api/products", productRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/transfers", transferRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/notifications", notificationRoutes);

// Health check — confirms backend is live on Vercel
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "StockFlow API is running 🚀", env: process.env.NODE_ENV || "development" });
});

// Error Handler Middleware
app.use(errorHandler);


const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 1. Connect MongoDB
    await connectDB();

    // 2. Connect Redis Caching
    //await connectRedis();

    // 3. Setup repeatable cron alert job in Redis BullMQ
    //await scheduleAlerts();

    // Start listening
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`);
    });
  } catch (error) {
    console.error("Critical server startup failure:", error.message);
    process.exit(1);
  }
};

// On Vercel: export app for serverless. Locally: start the server.
if (!process.env.VERCEL) {
  startServer();
}

export default app;
