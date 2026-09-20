import Warehouse from "../models/Warehouse.js";
import AuditLog from "../models/AuditLog.js";
import Inventory from "../models/Inventory.js";

// @desc    Get all warehouses
// @route   GET /api/warehouses
// @access  Private
export const getWarehouses = async (req, res, next) => {
  try {
    const warehouses = await Warehouse.find({});
    res.json({ success: true, count: warehouses.length, data: warehouses });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a warehouse
// @route   POST /api/warehouses
// @access  Private (Admin, Manager)
export const createWarehouse = async (req, res, next) => {
  try {
    const { name, location } = req.body;

    const warehouse = await Warehouse.create({
      name,
      location,
    });

    await AuditLog.create({
      action: "WAREHOUSE_CREATED",
      detail: `Warehouse ${warehouse.name} at ${warehouse.location} created`,
      performedBy: req.user.name,
    });

    res.status(201).json({ success: true, data: warehouse });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a warehouse
// @route   PUT /api/warehouses/:id
// @access  Private (Admin, Manager)
export const updateWarehouse = async (req, res, next) => {
  try {
    const { name, location, status } = req.body;

    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ success: false, message: "Warehouse not found" });
    }

    warehouse.name = name || warehouse.name;
    warehouse.location = location || warehouse.location;
    warehouse.status = status || warehouse.status;

    await warehouse.save();

    await AuditLog.create({
      action: "WAREHOUSE_UPDATED",
      detail: `Warehouse ${warehouse.name} updated`,
      performedBy: req.user.name,
    });

    res.json({ success: true, data: warehouse });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a warehouse
// @route   DELETE /api/warehouses/:id
// @access  Private (Admin)
export const deleteWarehouse = async (req, res, next) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ success: false, message: "Warehouse not found" });
    }

    const hasInventory = await Inventory.findOne({ warehouseId: req.params.id, quantity: { $gt: 0 } });
    if (hasInventory) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete warehouse with active stock. Transfer or adjust stock to 0 first.",
      });
    }

    await Inventory.deleteMany({ warehouseId: req.params.id });

    await warehouse.deleteOne();

    await AuditLog.create({
      action: "WAREHOUSE_DELETED",
      detail: `Warehouse ${warehouse.name} deleted`,
      performedBy: req.user.name,
    });

    res.json({ success: true, message: "Warehouse removed" });
  } catch (error) {
    next(error);
  }
};
