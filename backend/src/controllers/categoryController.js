import Category from "../models/Category.js";
import AuditLog from "../models/AuditLog.js";

// @desc    Get all categories
// @route   GET /api/categories
// @access  Private
export const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({}).populate("parent", "name");
    res.json({ success: true, count: categories.length, data: categories });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a category
// @route   POST /api/categories
// @access  Private (Admin, Manager)
export const createCategory = async (req, res, next) => {
  try {
    const { name, parent } = req.body;

    const category = await Category.create({
      name,
      parent: parent || null,
    });

    await AuditLog.create({
      action: "CATEGORY_CREATED",
      detail: `Category ${category.name} created`,
      performedBy: req.user.name,
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private (Admin, Manager)
export const updateCategory = async (req, res, next) => {
  try {
    const { name, parent } = req.body;

    let category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    if (parent && parent === req.params.id) {
      return res.status(400).json({ success: false, message: "A category cannot be its own parent" });
    }

    category.name = name || category.name;
    category.parent = parent === "" ? null : (parent || category.parent);

    await category.save();

    await AuditLog.create({
      action: "CATEGORY_UPDATED",
      detail: `Category ${category.name} updated`,
      performedBy: req.user.name,
    });

    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private (Admin, Manager)
export const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    await Category.updateMany({ parent: req.params.id }, { parent: null });

    await category.deleteOne();

    await AuditLog.create({
      action: "CATEGORY_DELETED",
      detail: `Category ${category.name} deleted`,
      performedBy: req.user.name,
    });

    res.json({ success: true, message: "Category removed" });
  } catch (error) {
    next(error);
  }
};
