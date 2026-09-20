import Party from "../models/Party.js";
import AuditLog from "../models/AuditLog.js";

// @desc    Get all parties (filtered by type)
// @route   GET /api/parties
// @access  Private
export const getParties = async (req, res, next) => {
  try {
    const { type } = req.query;
    const filter = {};
    if (type) {
      filter.type = type;
    }

    const parties = await Party.find(filter);
    res.json({ success: true, count: parties.length, data: parties });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a party
// @route   POST /api/parties
// @access  Private (Admin, Manager, Sales Staff)
export const createParty = async (req, res, next) => {
  try {
    const { name, email, phone, address, type } = req.body;

    if (!name || !type) {
      return res.status(400).json({ success: false, message: "Please enter name and type" });
    }

    const party = await Party.create({
      name,
      email,
      phone,
      address,
      type,
    });

    await AuditLog.create({
      action: `${type.toUpperCase()}_CREATED`,
      detail: `${type} ${party.name} created`,
      performedBy: req.user.name,
    });

    res.status(201).json({ success: true, data: party });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a party
// @route   PUT /api/parties/:id
// @access  Private (Admin, Manager, Sales Staff)
export const updateParty = async (req, res, next) => {
  try {
    const { name, email, phone, address } = req.body;

    const party = await Party.findById(req.params.id);
    if (!party) {
      return res.status(404).json({ success: false, message: "Party record not found" });
    }

    party.name = name || party.name;
    party.email = email || party.email;
    party.phone = phone || party.phone;
    party.address = address || party.address;

    await party.save();

    await AuditLog.create({
      action: `${party.type.toUpperCase()}_UPDATED`,
      detail: `${party.type} ${party.name} updated`,
      performedBy: req.user.name,
    });

    res.json({ success: true, data: party });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a party
// @route   DELETE /api/parties/:id
// @access  Private (Admin, Manager)
export const deleteParty = async (req, res, next) => {
  try {
    const party = await Party.findById(req.params.id);
    if (!party) {
      return res.status(404).json({ success: false, message: "Party record not found" });
    }

    const type = party.type;
    const name = party.name;

    await party.deleteOne();

    await AuditLog.create({
      action: `${type.toUpperCase()}_DELETED`,
      detail: `${type} ${name} deleted`,
      performedBy: req.user.name,
    });

    res.json({ success: true, message: "Party record removed" });
  } catch (error) {
    next(error);
  }
};
