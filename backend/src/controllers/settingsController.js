import AuditLog from "../models/AuditLog.js";
import User from "../models/User.js";
import Branch from "../models/Branch.js";
import Warehouse from "../models/Warehouse.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";

// @desc    Get system audit logs
// @route   GET /api/settings/audit-logs
// @access  Private (Admin)
export const getAuditLogs = async (req, res, next) => {
  try {
    const { action, search, limit = 150 } = req.query;
    const filter = {};

    if (action && action !== "ALL") {
      filter.action = { $regex: action, $options: "i" };
    }

    if (search) {
      filter.$or = [
        { detail: { $regex: search, $options: "i" } },
        { performedBy: { $regex: search, $options: "i" } },
        { action: { $regex: search, $options: "i" } },
      ];
    }

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10));

    res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all system users
// @route   GET /api/settings/users
// @access  Private (Admin)
export const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).select("-password").sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new user by Admin
// @route   POST /api/settings/users
// @access  Private (Admin)
export const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, status } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Please provide name, email, and password" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: "User with this email already exists" });
    }

    const validRoles = ["Admin", "Manager", "Inventory Staff", "Sales Staff"];
    const assignedRole = validRoles.includes(role) ? role : "Inventory Staff";

    const user = await User.create({
      name,
      email,
      password,
      role: assignedRole,
      status: status || "active",
    });

    await AuditLog.create({
      action: "USER_CREATED",
      detail: `New user ${user.email} (${user.role}) created by admin`,
      performedBy: req.user.name,
    });

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a user's details, role, or status
// @route   PUT /api/settings/users/:id
// @access  Private (Admin)
export const updateUser = async (req, res, next) => {
  try {
    const { name, email, role, status } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Safeguard: Prevent admin from revoking their own admin role or suspending themselves
    if (user._id.toString() === req.user.id) {
      if (role && role !== "Admin") {
        return res.status(400).json({ success: false, message: "You cannot change your own Admin role" });
      }
      if (status && status === "inactive") {
        return res.status(400).json({ success: false, message: "You cannot suspend your own account" });
      }
    }

    // Check if email is being updated to another existing email
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ success: false, message: "Email already taken by another user" });
      }
      user.email = email;
    }

    if (name) user.name = name;
    if (role) user.role = role;
    if (status) user.status = status;

    await user.save();

    await AuditLog.create({
      action: "USER_UPDATED",
      detail: `User ${user.email} updated by admin (${user.role}, ${user.status})`,
      performedBy: req.user.name,
    });

    res.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset a user's password by Admin
// @route   PUT /api/settings/users/:id/password
// @access  Private (Admin)
export const resetUserPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.password = newPassword;
    await user.save();

    await AuditLog.create({
      action: "PASSWORD_RESET",
      detail: `Password reset for user ${user.email} by admin`,
      performedBy: req.user.name,
    });

    res.json({ success: true, message: `Password for ${user.email} has been reset successfully` });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a user
// @route   DELETE /api/settings/users/:id
// @access  Private (Admin)
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ success: false, message: "You cannot delete your own account" });
    }

    await User.findByIdAndDelete(req.params.id);

    await AuditLog.create({
      action: "USER_DELETED",
      detail: `User ${user.email} (${user.role}) was permanently deleted by admin`,
      performedBy: req.user.name,
    });

    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// @desc    Get master system diagnostics & counts
// @route   GET /api/settings/stats
// @access  Private (Admin)
export const getSystemStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      activeUsers,
      adminCount,
      managerCount,
      inventoryStaffCount,
      salesStaffCount,
      totalAuditLogs,
      totalProducts,
      totalWarehouses,
      totalBranches,
      totalOrders,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: "active" }),
      User.countDocuments({ role: "Admin" }),
      User.countDocuments({ role: "Manager" }),
      User.countDocuments({ role: "Inventory Staff" }),
      User.countDocuments({ role: "Sales Staff" }),
      AuditLog.countDocuments(),
      Product.countDocuments(),
      Warehouse.countDocuments(),
      Branch.countDocuments(),
      Order.countDocuments(),
    ]);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers,
          byRole: {
            Admin: adminCount,
            Manager: managerCount,
            "Inventory Staff": inventoryStaffCount,
            "Sales Staff": salesStaffCount,
          },
        },
        counts: {
          auditLogs: totalAuditLogs,
          products: totalProducts,
          warehouses: totalWarehouses,
          branches: totalBranches,
          orders: totalOrders,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
