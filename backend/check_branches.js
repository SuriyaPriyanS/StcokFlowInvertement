import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/stockflow";

async function run() {
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const branches = await db.collection("branches").find().toArray();
    console.log("Branches in DB:", branches);
  } catch (err) {
    console.error("Error querying DB:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
