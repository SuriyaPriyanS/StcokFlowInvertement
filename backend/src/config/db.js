import mongoose from "mongoose";
import Branch from "../models/Branch.js";
import User from "../models/User.js";

const seedBranches = async () => {
  try {
    const count = await Branch.countDocuments();
    if (count === 0) {
      console.log("No branches found in DB. Seeding default branches...");
      await Branch.create([
        {
          name: "Retail Branch - T. Nagar",
          location: "Chennai",
          managerName: "Kavitha Rajan",
          managerPhone: "9840099001",
          status: "active",
        },
        {
          name: "Retail Branch - Indiranagar",
          location: "Bangalore",
          managerName: "Suresh Babu",
          managerPhone: "9880099002",
          status: "active",
        },
        {
          name: "Retail Branch - Banjara Hills",
          location: "Hyderabad",
          managerName: "Divya Reddy",
          managerPhone: "9900099003",
          status: "active",
        },
      ]);
      console.log("Default branches seeded successfully!");
    }
  } catch (error) {
    console.error("Error seeding default branches:", error.message);
  }
};

const seedUsers = async () => {
  try {
    const count = await User.countDocuments();
    if (count === 0) {
      console.log("No users found in DB. Seeding default users...");
      await User.create([
        {
          name: "System Admin",
          email: "admin@stockflow.com",
          password: "adminpassword",
          role: "Admin",
          status: "active",
        },
        {
          name: "Manager User",
          email: "manager@stockflow.com",
          password: "managerpassword",
          role: "Manager",
          status: "active",
        },
        {
          name: "Inventory Staff User",
          email: "inventory@stockflow.com",
          password: "inventorypassword",
          role: "Inventory Staff",
          status: "active",
        },
        {
          name: "Sales Staff User",
          email: "sales@stockflow.com",
          password: "salespassword",
          role: "Sales Staff",
          status: "active",
        },
      ]);
      console.log("Default users seeded successfully!");
    }
  } catch (error) {
    console.error("Error seeding default users:", error.message);
  }
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    await seedBranches();
    await seedUsers();
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
