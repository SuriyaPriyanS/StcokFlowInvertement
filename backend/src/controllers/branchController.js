import Branch from "../models/Branch.js";
import AuditLog from "../models/AuditLog.js";

// @desc    Get all branches
// @route   GET /api/branches
// @access  Private
export const getBranches = async (req, res, next) => {
  try {
    const branches = await Branch.find({});
    res.json({ success: true, count: branches.length, data: branches });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a branch
// @route   POST /api/branches
// @access  Private (Admin, Manager)
export const createBranch = async (req, res, next) => {
  try {
    const { name, location, managerName, managerPhone } = req.body;

    if (!name || !location || !managerName || !managerPhone) {
      return res.status(400).json({ success: false, message: "Please provide all required fields" });
    }

    const branch = await Branch.create({
      name,
      location,
      managerName,
      managerPhone,
    });

    await AuditLog.create({
      action: "BRANCH_CREATED",
      detail: `Retail Branch ${branch.name} at ${branch.location} created`,
      performedBy: req.user.name,
    });

    res.status(201).json({ success: true, data: branch });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a branch
// @route   PUT /api/branches/:id
// @access  Private (Admin, Manager)
export const updateBranch = async (req, res, next) => {
  try {
    const { name, location, managerName, managerPhone, status } = req.body;

    const branch = await Branch.findById(req.params.id);
    if (!branch) {
      return res.status(404).json({ success: false, message: "Branch not found" });
    }

    branch.name = name || branch.name;
    branch.location = location || branch.location;
    branch.managerName = managerName || branch.managerName;
    branch.managerPhone = managerPhone || branch.managerPhone;
    branch.status = status || branch.status;

    await branch.save();

    await AuditLog.create({
      action: "BRANCH_UPDATED",
      detail: `Retail Branch ${branch.name} updated`,
      performedBy: req.user.name,
    });

    res.json({ success: true, data: branch });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a branch
// @route   DELETE /api/branches/:id
// @access  Private (Admin)
export const deleteBranch = async (req, res, next) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) {
      return res.status(404).json({ success: false, message: "Branch not found" });
    }

    await branch.deleteOne();

    await AuditLog.create({
      action: "BRANCH_DELETED",
      detail: `Retail Branch ${branch.name} deleted`,
      performedBy: req.user.name,
    });

    res.json({ success: true, message: "Branch removed" });
  } catch (error) {
    next(error);
  }
};
